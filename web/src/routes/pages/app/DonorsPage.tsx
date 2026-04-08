import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
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
type CreatedContribution = {
  contributionId: number;
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
  const [appliedQ, setAppliedQ] = useState("");
  const [data, setData] = useState<Paged<Supporter> | null>(null);
  const [selectedSupporter, setSelectedSupporter] = useState<Supporter | null>(null);
  const [contribs, setContribs] = useState<Paged<Contribution> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [stewardship, setStewardship] = useState<DonorStewardship | null>(null);
  const [supporterPage, setSupporterPage] = useState(1);
  const [contribPage, setContribPage] = useState(1);
  const [showSupporterForm, setShowSupporterForm] = useState(false);
  const [showContributionForm, setShowContributionForm] = useState(false);
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

  const load = async (page = supporterPage, query = appliedQ) => {
    setError(null);
    const params = new URLSearchParams({
      q: query,
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    const res = await apiFetch<Paged<Supporter>>(`/api/supporters?${params.toString()}`, {
      token: auth.token ?? undefined,
    });
    setData(res);
  };

  const loadContribs = async (supporterId: number, page = contribPage) => {
    const params = new URLSearchParams({
      supporterId: String(supporterId),
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    const res = await apiFetch<Paged<Contribution>>(`/api/contributions?${params.toString()}`, {
      token: auth.token ?? undefined,
    });
    setContribs(res);
  };

  useEffect(() => {
    void apiFetch<DonorStewardship>("/api/analytics/donor-stewardship", { token: auth.token ?? undefined })
      .then(setStewardship)
      .catch(() => {});
  }, [auth.token]);

  useEffect(() => {
    void load(supporterPage, appliedQ).catch((e) => setError((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.token, supporterPage, appliedQ]);

  useEffect(() => {
    if (!selectedSupporter) return;
    void loadContribs(selectedSupporter.supporterId, contribPage).catch((e) => setError((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.token, selectedSupporter?.supporterId, contribPage]);

  const supporterTotalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const supporterRows = data?.items ?? [];
  const contribTotalPages = Math.max(1, Math.ceil((contribs?.total ?? 0) / PAGE_SIZE));
  const contribRows = contribs?.items ?? [];

  return (
    <div className="admin-page">
      <div className="card">
        <div className="admin-header">
          <div className="admin-header-copy">
            <h1 style={{ marginTop: 0 }}>Donors & Contributions</h1>
            <p className="muted">Supporters, stewardship, and contribution history.</p>
          </div>
          {auth.hasRole("Admin") ? (
            <button className="btn primary" onClick={() => setShowSupporterForm((open) => !open)}>
              {showSupporterForm ? "Close" : "Add supporter"}
            </button>
          ) : null}
        </div>
        {error ? <div className="badge danger">{error}</div> : null}
        {notice ? <div className="badge ok" style={{ marginTop: 8 }}>{notice}</div> : null}

        <div className="admin-inline-grid" style={{ marginTop: 10 }}>
          <input className="input span-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search supporters..." />
          <button
            className="btn"
            onClick={() => {
              setNotice(null);
              setSupporterPage(1);
              setAppliedQ(q.trim());
            }}
          >
            Search
          </button>
        </div>

        <div className={`process-collapsible ${showSupporterForm ? "open" : ""}`} aria-hidden={!showSupporterForm}>
          <div className="card process-form-card">
            <div className="process-header process-inline-header">
              <div>
                <strong>Supporter details</strong>
              </div>
            </div>
            <div className="admin-inline-grid">
              <label className="admin-form-label span-5">
                <span className="muted">Full name</span>
                <input className="input" value={newSupporter.fullName} onChange={(e) => setNewSupporter((p) => ({ ...p, fullName: e.target.value }))} />
              </label>
              <label className="admin-form-label span-4">
                <span className="muted">Email</span>
                <input className="input" value={newSupporter.email} onChange={(e) => setNewSupporter((p) => ({ ...p, email: e.target.value }))} />
              </label>
              <label className="admin-form-label span-3">
                <span className="muted">Type</span>
                <select className="input" value={newSupporter.supporterType} onChange={(e) => setNewSupporter((p) => ({ ...p, supporterType: e.target.value }))}>
                  <option value="Monetary">Monetary</option>
                  <option value="InKind">In-kind</option>
                  <option value="Time">Time</option>
                  <option value="Skills">Skills</option>
                  <option value="Advocacy">Advocacy</option>
                </select>
              </label>
            </div>
            <div className="row process-form-actions" style={{ marginTop: 12, justifyContent: "flex-end" }}>
              <button
                className="btn primary"
                onClick={async () => {
                  setNotice(null);
                  if (!newSupporter.fullName.trim()) return setError("Supporter full name is required.");
                  try {
                    const created = await apiFetch<Supporter>("/api/supporters", {
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
                    setQ(created.fullName);
                    setAppliedQ(created.fullName);
                    setSupporterPage(1);
                    setShowSupporterForm(false);
                    setNotice(`Supporter created: ${created.fullName}`);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Save supporter
              </button>
            </div>
          </div>
        </div>
      </div>

      {stewardship ? (
        <div className="admin-split-grid">
          <div className="card tone-peach">
            <h2 style={{ marginTop: 0 }}>Lapse watchlist</h2>
            <div className="admin-mini-list">
              {stewardship.watchlist.slice(0, 6).map((x) => (
                <div key={x.supporterId} className="admin-mini-list-item">
                  <div style={{ fontWeight: 700 }}>{x.displayName}</div>
                  <div className="muted">{x.recencyDays}d since last gift, expected {x.expectedWindowDays}d.</div>
                  <div className="muted">{x.outcomeNarrative}</div>
                </div>
              ))}
              {stewardship.watchlist.length === 0 ? <div className="muted">No current lapse-risk donors detected.</div> : null}
            </div>
          </div>
          <div className="card tone-aqua">
            <h2 style={{ marginTop: 0 }}>Upgrade prompts</h2>
            <div className="admin-mini-list">
              {stewardship.donorLadderMidTier.slice(0, 6).map((x) => (
                <div key={x.supporterId} className="admin-mini-list-item">
                  <div style={{ fontWeight: 700 }}>{x.displayName}</div>
                  <div className="muted">PHP {x.totalPhp.toLocaleString(undefined, { maximumFractionDigits: 0 })} across {x.giftCount} gifts.</div>
                  <div className="muted">{x.ladderPrompt}</div>
                </div>
              ))}
              {stewardship.donorLadderMidTier.length === 0 ? <div className="muted">No mid-tier prompts yet.</div> : null}
            </div>
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
                      className="btn admin-table-action"
                      onClick={async () => {
                        setNotice(null);
                        setSelectedSupporter(x);
                        setContribPage(1);
                        setShowContributionForm(false);
                        try {
                          await loadContribs(x.supporterId, 1);
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      {x.fullName}
                    </button>
                  </td>
                  <td data-label="Email" className="muted">
                    {x.email ?? "-"}
                  </td>
                  <td data-label="Type">
                    <span className="badge">{x.supporterType}</span>
                  </td>
                  <td data-label="Status">
                    {x.isActive ? <span className="badge">Active</span> : <span className="badge">Inactive</span>}
                  </td>
                  <td data-label="Actions">
                    {auth.hasRole("Admin") ? (
                      <div className="row admin-compact-actions">
                        <button className="btn admin-table-action" onClick={() => {
                          setEditingSupporterId(x.supporterId);
                          setEditingSupporter({
                            fullName: x.fullName,
                            email: x.email ?? "",
                            supporterType: x.supporterType,
                            isActive: x.isActive,
                          });
                        }}>Edit</button>
                        <button
                          className="btn danger admin-table-action"
                          onClick={async () => {
                            if (!confirm(`Delete ${x.fullName}?`)) return;
                            try {
                              await apiFetch<void>(`/api/supporters/${x.supporterId}?confirm=true`, {
                                method: "DELETE",
                                token: auth.token ?? undefined,
                              });
                              setNotice(`Supporter deleted: ${x.fullName}`);
                              await load(supporterPage, appliedQ);
                            } catch (e) {
                              setError((e as Error).message);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <span className="muted">View only</span>
                    )}
                  </td>
                </tr>
              ))}
              {editingSupporterId !== null ? (
                <tr>
                  <td>
                    <input className="input" value={editingSupporter.fullName} onChange={(e) => setEditingSupporter((prev) => ({ ...prev, fullName: e.target.value }))} />
                  </td>
                  <td>
                    <input className="input" value={editingSupporter.email} onChange={(e) => setEditingSupporter((prev) => ({ ...prev, email: e.target.value }))} placeholder="Email" />
                  </td>
                  <td>
                    <select className="input" value={editingSupporter.supporterType} onChange={(e) => setEditingSupporter((prev) => ({ ...prev, supporterType: e.target.value }))}>
                      <option value="Monetary">Monetary</option>
                      <option value="InKind">In-kind</option>
                      <option value="Time">Time</option>
                      <option value="Skills">Skills</option>
                      <option value="Advocacy">Advocacy</option>
                    </select>
                  </td>
                  <td>
                    <label className="row" style={{ gap: 8, alignItems: "center" }}>
                      <input type="checkbox" checked={editingSupporter.isActive} onChange={(e) => setEditingSupporter((prev) => ({ ...prev, isActive: e.target.checked }))} />
                      <span className="muted">{editingSupporter.isActive ? "Active" : "Inactive"}</span>
                    </label>
                  </td>
                  <td>
                    <div className="row admin-compact-actions">
                      <button
                        className="btn primary admin-table-action"
                        onClick={async () => {
                          const original = data?.items.find((s) => s.supporterId === editingSupporterId);
                          if (!original) return;
                          try {
                            setNotice(null);
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
                            setNotice(`Supporter updated: ${editingSupporter.fullName.trim() || original.fullName}`);
                            await load(supporterPage, appliedQ);
                          } catch (e) {
                            setError((e as Error).message);
                          }
                        }}
                      >
                        Save
                      </button>
                      <button className="btn admin-table-action" onClick={() => setEditingSupporterId(null)}>Cancel</button>
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
        <div className="admin-table-head">
          <div className="admin-header-copy">
            <h2 style={{ marginTop: 0 }}>Contribution history</h2>
            <p className="muted">{selectedSupporter ? selectedSupporter.fullName : "Select a supporter to view contribution history."}</p>
          </div>
          {selectedSupporter && auth.hasRole("Admin") ? (
            <button className="btn primary" onClick={() => setShowContributionForm((open) => !open)}>
              {showContributionForm ? "Close" : "Add contribution"}
            </button>
          ) : null}
        </div>
        {!selectedSupporter ? (
          <div className="muted">Select a supporter above to view their contribution history.</div>
        ) : (
          <>
            <div className="admin-pill-row" style={{ marginBottom: 10 }}>
              <span className="badge">Supporter ID: {selectedSupporter.supporterId}</span>
              <span className="badge">{selectedSupporter.supporterType}</span>
            </div>

            <div className={`process-collapsible ${showContributionForm ? "open" : ""}`} aria-hidden={!showContributionForm}>
              <div className="card process-form-card">
                <div className="process-header process-inline-header">
                  <div>
                    <strong>Contribution details</strong>
                  </div>
                </div>
                <div className="admin-inline-grid">
                  <label className="admin-form-label span-3">
                    <span className="muted">Type</span>
                    <select className="input" value={newContribution.contributionType} onChange={(e) => setNewContribution((p) => ({ ...p, contributionType: e.target.value }))}>
                      <option value="Monetary">Monetary</option>
                      <option value="InKind">InKind</option>
                      <option value="Time">Time</option>
                      <option value="Skills">Skills</option>
                      <option value="Advocacy">Advocacy</option>
                    </select>
                  </label>
                  <label className="admin-form-label span-2">
                    <span className="muted">Amount</span>
                    <input className="input" value={newContribution.amount} onChange={(e) => setNewContribution((p) => ({ ...p, amount: e.target.value }))} />
                  </label>
                  <label className="admin-form-label span-2">
                    <span className="muted">Estimated value</span>
                    <input className="input" value={newContribution.estimatedValue} onChange={(e) => setNewContribution((p) => ({ ...p, estimatedValue: e.target.value }))} />
                  </label>
                  <label className="admin-form-label span-2">
                    <span className="muted">Impact unit</span>
                    <input className="input" value={newContribution.impactUnit} onChange={(e) => setNewContribution((p) => ({ ...p, impactUnit: e.target.value }))} />
                  </label>
                  <label className="admin-form-label span-3">
                    <span className="muted">Campaign</span>
                    <input className="input" value={newContribution.campaignName} onChange={(e) => setNewContribution((p) => ({ ...p, campaignName: e.target.value }))} />
                  </label>
                  <label className="admin-form-label span-12">
                    <span className="muted">Notes</span>
                    <input className="input" value={newContribution.notes} onChange={(e) => setNewContribution((p) => ({ ...p, notes: e.target.value }))} />
                  </label>
                </div>
                {newContribution.contributionType === "InKind" ? (
                  <div className="admin-inline-grid">
                    <label className="admin-form-label span-8">
                      <span className="muted">In-kind item</span>
                      <input className="input" value={newContribution.inKindItemName} onChange={(e) => setNewContribution((p) => ({ ...p, inKindItemName: e.target.value }))} />
                    </label>
                    <label className="admin-form-label span-4">
                      <span className="muted">Quantity</span>
                      <input className="input" value={newContribution.inKindQuantity} onChange={(e) => setNewContribution((p) => ({ ...p, inKindQuantity: e.target.value }))} />
                    </label>
                  </div>
                ) : null}
                <div className="row process-form-actions" style={{ marginTop: 12, justifyContent: "flex-end" }}>
                  <button
                    className="btn primary"
                    onClick={async () => {
                      const amount = newContribution.amount.trim() ? Number(newContribution.amount) : null;
                      const estimatedValue = newContribution.estimatedValue.trim() ? Number(newContribution.estimatedValue) : null;
                      try {
                        const created = await apiFetch<CreatedContribution>("/api/contributions", {
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
                        setShowContributionForm(false);
                        setNotice(`Contribution added for ${selectedSupporter.fullName}.`);
                        await loadContribs(selectedSupporter.supporterId, contribPage);
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    Save contribution
                  </button>
                </div>
              </div>
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
                        {c.campaignName ?? "-"}
                      </td>
                      <td data-label="Actions">
                        {auth.hasRole("Admin") ? (
                          <button
                            className="btn danger admin-table-action"
                            onClick={async () => {
                              if (!confirm("Delete this contribution?")) return;
                              try {
                                await apiFetch<void>(`/api/contributions/${c.contributionId}?confirm=true`, {
                                  method: "DELETE",
                                  token: auth.token ?? undefined,
                                });
                                setNotice(`Contribution deleted for ${selectedSupporter.fullName}.`);
                                await loadContribs(selectedSupporter.supporterId, contribPage);
                              } catch (e) {
                                setError((e as Error).message);
                              }
                            }}
                          >
                            Delete
                          </button>
                        ) : (
                          <span className="muted">View only</span>
                        )}
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
