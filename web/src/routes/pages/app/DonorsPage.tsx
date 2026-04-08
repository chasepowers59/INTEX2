import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { RequireRole } from "../../guards";
import { PaginationControls } from "../../../components/ui/PaginationControls";

type Supporter = {
  supporterId: number;
  fullName: string;
  email: string | null;
  supporterType: string;
  isActive: boolean;
};

type Paged<T> = { page: number; pageSize: number; total: number; items: T[] };
type Contribution = {
  contributionId: number;
  contributionType: string;
  amount: number | null;
  estimatedValue?: number | null;
  impactUnit?: string | null;
  currency: string;
  contributionDate: string;
  campaignName: string | null;
  notes: string | null;
};
type DonorStewardship = {
  watchlist: {
    supporterId: number;
    displayName: string;
    recencyDays: number;
    expectedWindowDays: number;
    totalPhp: number;
    outcomeNarrative: string;
  }[];
  donorLadderMidTier: {
    supporterId: number;
    displayName: string;
    totalPhp: number;
    giftCount: number;
    ladderPrompt: string;
  }[];
};

export function DonorsPage() {
  const auth = useAuth();
  const PAGE_SIZE = 10;
  const [q, setQ] = useState("");
  const [data, setData] = useState<Paged<Supporter> | null>(null);
  const [selectedSupporter, setSelectedSupporter] = useState<Supporter | null>(null);
  const [contribs, setContribs] = useState<Paged<Contribution> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stewardship, setStewardship] = useState<DonorStewardship | null>(null);
  const [supporterPage, setSupporterPage] = useState(1);
  const [contribPage, setContribPage] = useState(1);
  const [newSupporter, setNewSupporter] = useState({ fullName: "", email: "", supporterType: "Monetary" });
  const [editingSupporterId, setEditingSupporterId] = useState<number | null>(null);
  const [editingSupporter, setEditingSupporter] = useState({
    fullName: "",
    email: "",
    supporterType: "Monetary",
    isActive: true,
  });
  const [newContribution, setNewContribution] = useState({
    contributionType: "Monetary",
    amount: "",
    estimatedValue: "",
    impactUnit: "",
    campaignName: "",
    notes: "",
    inKindItemName: "",
    inKindQuantity: "1",
  });

  const load = async () => {
    setError(null);
    const res = await apiFetch<Paged<Supporter>>(`/api/supporters?q=${encodeURIComponent(q)}`, {
      token: auth.token ?? undefined,
    });
    setData(res);
  };

  const loadContribs = async (supporterId: number) => {
    const res = await apiFetch<Paged<Contribution>>(`/api/contributions?supporterId=${supporterId}`, {
      token: auth.token ?? undefined,
    });
    setContribs(res);
  };

  useEffect(() => {
    void load();
    void apiFetch<DonorStewardship>("/api/analytics/donor-stewardship", { token: auth.token ?? undefined })
      .then(setStewardship)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const supporterTotalPages = Math.max(1, Math.ceil((data?.items.length ?? 0) / PAGE_SIZE));
  const supporterRows = (data?.items ?? []).slice((supporterPage - 1) * PAGE_SIZE, supporterPage * PAGE_SIZE);
  const contribTotalPages = Math.max(1, Math.ceil((contribs?.items.length ?? 0) / PAGE_SIZE));
  const contribRows = (contribs?.items ?? []).slice((contribPage - 1) * PAGE_SIZE, contribPage * PAGE_SIZE);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Donors & Contributions</h1>
        <p className="muted">Employees can view. Only admins can create/update/delete.</p>
        <div className="row" style={{ marginTop: 8 }}>
          <span className="badge ok">Employee: view trends and histories</span>
          <span className="badge warn">Admin: full supporter and contribution CRUD</span>
        </div>
        {error ? <div className="badge danger">{error}</div> : null}
        <div className="row" style={{ marginTop: 8 }}>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search supporters…" />
          <button className="btn" onClick={() => void load()}>
            Search
          </button>
          <RequireRole role="Admin">
            <button
              className="btn primary"
              onClick={async () => {
                if (!newSupporter.fullName.trim()) return setError("Supporter full name is required.");
                try {
                  await apiFetch<Supporter>("/api/supporters", {
                    method: "POST",
                    token: auth.token ?? undefined,
                    body: JSON.stringify({
                      fullName: newSupporter.fullName.trim(),
                      email: newSupporter.email.trim() || null,
                      supporterType: newSupporter.supporterType,
                      isActive: true,
                    }),
                  });
                  setNewSupporter({ fullName: "", email: "", supporterType: "Monetary" });
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
        <RequireRole role="Admin">
          <div className="row" style={{ marginTop: 10 }}>
            <input className="input" placeholder="Full name" value={newSupporter.fullName} onChange={(e) => setNewSupporter((p) => ({ ...p, fullName: e.target.value }))} />
            <input className="input" placeholder="Email (optional)" value={newSupporter.email} onChange={(e) => setNewSupporter((p) => ({ ...p, email: e.target.value }))} />
            <select className="input" value={newSupporter.supporterType} onChange={(e) => setNewSupporter((p) => ({ ...p, supporterType: e.target.value }))}>
              <option value="Monetary">Monetary</option>
              <option value="InKind">In-kind</option>
              <option value="Time">Time</option>
              <option value="Skills">Skills</option>
              <option value="Advocacy">Advocacy</option>
            </select>
          </div>
        </RequireRole>
      </div>

      {stewardship ? (
        <div className="row">
          <div className="card tone-peach" style={{ flex: "1 1 320px" }}>
            <h2 style={{ marginTop: 0 }}>Predictive lapse watchlist</h2>
            <p className="muted">Donors who are past their expected giving window. Prioritize gratitude update plus check-in.</p>
            <ul className="trust-list muted">
              {stewardship.watchlist.slice(0, 6).map((x) => (
                <li key={x.supporterId}>
                  {x.displayName}: {x.recencyDays}d since last gift (expected {x.expectedWindowDays}d). {x.outcomeNarrative}
                </li>
              ))}
              {stewardship.watchlist.length === 0 ? <li>No current lapse-risk donors detected.</li> : null}
            </ul>
          </div>
          <div className="card tone-aqua" style={{ flex: "1 1 320px" }}>
            <h2 style={{ marginTop: 0 }}>Donor ladder prompts</h2>
            <p className="muted">Mid-tier donors likely ready for a targeted program ask instead of a generic appeal.</p>
            <ul className="trust-list muted">
              {stewardship.donorLadderMidTier.slice(0, 6).map((x) => (
                <li key={x.supporterId}>
                  {x.displayName}: ₱{x.totalPhp.toLocaleString(undefined, { maximumFractionDigits: 0 })} across {x.giftCount} gifts. {x.ladderPrompt}
                </li>
              ))}
              {stewardship.donorLadderMidTier.length === 0 ? <li>No mid-tier ladder prompts yet.</li> : null}
            </ul>
          </div>
        </div>
      ) : null}

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
              {supporterRows.map((x) => (
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
                        <button className="btn" onClick={() => {
                          setEditingSupporterId(x.supporterId);
                          setEditingSupporter({
                            fullName: x.fullName,
                            email: x.email ?? "",
                            supporterType: x.supporterType,
                            isActive: x.isActive,
                          });
                        }}>Edit</button>
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
              {editingSupporterId !== null ? (
                <tr>
                  <td>
                    <input
                      className="input"
                      value={editingSupporter.fullName}
                      onChange={(e) => setEditingSupporter((prev) => ({ ...prev, fullName: e.target.value }))}
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      value={editingSupporter.email}
                      onChange={(e) => setEditingSupporter((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="Email"
                    />
                  </td>
                  <td>
                    <select
                      className="input"
                      value={editingSupporter.supporterType}
                      onChange={(e) => setEditingSupporter((prev) => ({ ...prev, supporterType: e.target.value }))}
                    >
                      <option value="Monetary">Monetary</option>
                      <option value="InKind">In-kind</option>
                      <option value="Time">Time</option>
                      <option value="Skills">Skills</option>
                      <option value="Advocacy">Advocacy</option>
                    </select>
                  </td>
                  <td>
                    <label className="row" style={{ gap: 8, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={editingSupporter.isActive}
                        onChange={(e) => setEditingSupporter((prev) => ({ ...prev, isActive: e.target.checked }))}
                      />
                      <span className="muted">{editingSupporter.isActive ? "Active" : "Inactive"}</span>
                    </label>
                  </td>
                  <td>
                    <div className="row">
                      <button className="btn primary" onClick={async () => {
                        const original = data?.items.find((s) => s.supporterId === editingSupporterId);
                        if (!original) return;
                        try {
                          await apiFetch<void>(`/api/supporters/${editingSupporterId}`, {
                            method: "PUT",
                            token: auth.token ?? undefined,
                            body: JSON.stringify({
                              ...original,
                              fullName: editingSupporter.fullName.trim() || original.fullName,
                              email: editingSupporter.email.trim() || null,
                              supporterType: editingSupporter.supporterType,
                              isActive: editingSupporter.isActive,
                            }),
                          });
                          setEditingSupporterId(null);
                          await load();
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}>Save</button>
                      <button className="btn" onClick={() => setEditingSupporterId(null)}>Cancel</button>
                    </div>
                  </td>
                </tr>
              ) : null}
              {data && supporterRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    No supporters found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={supporterPage}
          totalPages={supporterTotalPages}
          onPrev={() => setSupporterPage((p) => Math.max(1, p - 1))}
          onNext={() => setSupporterPage((p) => Math.min(supporterTotalPages, p + 1))}
        />
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
                    const amount = newContribution.amount.trim() ? Number(newContribution.amount) : null;
                    const estimatedValue = newContribution.estimatedValue.trim() ? Number(newContribution.estimatedValue) : null;
                    try {
                      const created = await apiFetch<any>("/api/contributions", {
                        method: "POST",
                        token: auth.token ?? undefined,
                        body: JSON.stringify({
                          supporterId: selectedSupporter.supporterId,
                          contributionType: newContribution.contributionType,
                          amount,
                          estimatedValue,
                          impactUnit: newContribution.impactUnit.trim() || null,
                          currency: "PHP",
                          contributionDate: new Date().toISOString().slice(0, 10),
                          campaignName: newContribution.campaignName.trim() || null,
                          notes: newContribution.notes.trim() || null,
                        }),
                      });
                      if (newContribution.contributionType === "InKind" && newContribution.inKindItemName.trim()) {
                        await apiFetch<void>(`/api/contributions/${created.contributionId}/in-kind-items`, {
                          method: "POST",
                          token: auth.token ?? undefined,
                          body: JSON.stringify({
                            itemName: newContribution.inKindItemName.trim(),
                            itemCategory: "General",
                            quantity: Number(newContribution.inKindQuantity) || 1,
                            unitOfMeasure: "item",
                          }),
                        });
                      }
                      setNewContribution({
                        contributionType: "Monetary",
                        amount: "",
                        estimatedValue: "",
                        impactUnit: "",
                        campaignName: "",
                        notes: "",
                        inKindItemName: "",
                        inKindQuantity: "1",
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
            <RequireRole role="Admin">
              <div className="row" style={{ marginTop: 10 }}>
                <select className="input" value={newContribution.contributionType} onChange={(e) => setNewContribution((p) => ({ ...p, contributionType: e.target.value }))}>
                  <option value="Monetary">Monetary</option>
                  <option value="InKind">InKind</option>
                  <option value="Time">Time</option>
                  <option value="Skills">Skills</option>
                  <option value="Advocacy">Advocacy</option>
                </select>
                <input className="input" placeholder="Amount" value={newContribution.amount} onChange={(e) => setNewContribution((p) => ({ ...p, amount: e.target.value }))} />
                <input className="input" placeholder="Estimated value" value={newContribution.estimatedValue} onChange={(e) => setNewContribution((p) => ({ ...p, estimatedValue: e.target.value }))} />
                <input className="input" placeholder="Impact unit" value={newContribution.impactUnit} onChange={(e) => setNewContribution((p) => ({ ...p, impactUnit: e.target.value }))} />
                <input className="input" placeholder="Campaign" value={newContribution.campaignName} onChange={(e) => setNewContribution((p) => ({ ...p, campaignName: e.target.value }))} />
                <input className="input" placeholder="Notes" value={newContribution.notes} onChange={(e) => setNewContribution((p) => ({ ...p, notes: e.target.value }))} />
              </div>
              {newContribution.contributionType === "InKind" ? (
                <div className="row" style={{ marginTop: 8 }}>
                  <input className="input" placeholder="In-kind item name" value={newContribution.inKindItemName} onChange={(e) => setNewContribution((p) => ({ ...p, inKindItemName: e.target.value }))} />
                  <input className="input" placeholder="In-kind quantity" value={newContribution.inKindQuantity} onChange={(e) => setNewContribution((p) => ({ ...p, inKindQuantity: e.target.value }))} />
                </div>
              ) : null}
            </RequireRole>

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
                  {contribRows.map((c) => (
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
                  {contribs && contribRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="muted">
                        No contributions found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={contribPage}
              totalPages={contribTotalPages}
              onPrev={() => setContribPage((p) => Math.max(1, p - 1))}
              onNext={() => setContribPage((p) => Math.min(contribTotalPages, p + 1))}
            />
          </>
        )}
      </div>
    </div>
  );
}
