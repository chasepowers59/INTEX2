import React, { useEffect, useMemo, useRef, useState } from "react";
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

const PAGE_SIZE = 10;

export function DonorsPage() {
  const auth = useAuth();
  const closeTimerRef = useRef<number | null>(null);
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [supporterPage, setSupporterPage] = useState(1);
  const [contribPage, setContribPage] = useState(1);
  const [data, setData] = useState<Paged<Supporter> | null>(null);
  const [selectedSupporter, setSelectedSupporter] = useState<Supporter | null>(null);
  const [contribs, setContribs] = useState<Paged<Contribution> | null>(null);
  const [closingSupporter, setClosingSupporter] = useState<Supporter | null>(null);
  const [closingContribs, setClosingContribs] = useState<Paged<Contribution> | null>(null);
  const [stewardship, setStewardship] = useState<DonorStewardship | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showSupporterForm, setShowSupporterForm] = useState(false);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [newSupporter, setNewSupporter] = useState({ fullName: "", email: "", supporterType: "Monetary" });
  const [newContribution, setNewContribution] = useState({
    contributionType: "Monetary",
    amount: "",
    estimatedValue: "",
    campaignName: "",
    notes: "",
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

  const loadContribs = async (supporterId: number, page = 1) => {
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

  const queueClosingRow = () => {
    if (!selectedSupporter) return;
    setClosingSupporter(selectedSupporter);
    setClosingContribs(contribs);
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setClosingSupporter(null);
      setClosingContribs(null);
      closeTimerRef.current = null;
    }, 220);
  };

  const openSupporter = async (supporterId: number) => {
    try {
      setError(null);
      setNotice(null);
      if (selectedSupporter?.supporterId === supporterId) {
        queueClosingRow();
        setSelectedSupporter(null);
        setContribs(null);
        setContribPage(1);
        setShowContributionForm(false);
        return;
      }
      if (selectedSupporter) {
        queueClosingRow();
      }
      const supporter = await apiFetch<Supporter>(`/api/supporters/${supporterId}`, {
        token: auth.token ?? undefined,
      });
      const visible = data?.items.some((item) => item.supporterId === supporterId) ?? false;
      if (!visible) {
        setQ(supporter.fullName);
        setAppliedQ(supporter.fullName);
        setSupporterPage(1);
      }
      setSelectedSupporter(supporter);
      setContribs(null);
      setContribPage(1);
      await loadContribs(supporterId, 1);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    void load(supporterPage, appliedQ).catch((e) => setError((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.token, supporterPage, appliedQ]);

  useEffect(() => {
    void apiFetch<DonorStewardship>("/api/analytics/donor-stewardship", {
      token: auth.token ?? undefined,
    })
      .then(setStewardship)
      .catch(() => {});
  }, [auth.token]);

  const watchMap = useMemo(
    () => new Map((stewardship?.watchlist ?? []).map((item) => [item.supporterId, item])),
    [stewardship],
  );
  const upgradeMap = useMemo(
    () => new Map((stewardship?.donorLadderMidTier ?? []).map((item) => [item.supporterId, item])),
    [stewardship],
  );

  const supporterRows = data?.items ?? [];
  const contribRows = contribs?.items ?? [];
  const supporterTotalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const contribTotalPages = Math.max(1, Math.ceil((contribs?.total ?? 0) / PAGE_SIZE));
  const selectedWatch = selectedSupporter ? watchMap.get(selectedSupporter.supporterId) : null;
  const selectedUpgrade = selectedSupporter ? upgradeMap.get(selectedSupporter.supporterId) : null;
  const selectedLastGift = contribRows
    .filter((row) => row.amount !== null)
    .sort((a, b) => b.contributionDate.localeCompare(a.contributionDate))[0];

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

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
          <input
            className="input span-8"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search supporters..."
          />
          <button
            className="btn"
            onClick={() => {
              setSelectedSupporter(null);
              setContribs(null);
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
              <strong>Supporter details</strong>
            </div>
            <div className="admin-inline-grid">
              <label className="admin-form-label span-5">
                <span className="muted">Full name</span>
                <input
                  className="input"
                  value={newSupporter.fullName}
                  onChange={(e) => setNewSupporter((p) => ({ ...p, fullName: e.target.value }))}
                />
              </label>
              <label className="admin-form-label span-4">
                <span className="muted">Email</span>
                <input
                  className="input"
                  value={newSupporter.email}
                  onChange={(e) => setNewSupporter((p) => ({ ...p, email: e.target.value }))}
                />
              </label>
              <label className="admin-form-label span-3">
                <span className="muted">Type</span>
                <select
                  className="input"
                  value={newSupporter.supporterType}
                  onChange={(e) => setNewSupporter((p) => ({ ...p, supporterType: e.target.value }))}
                >
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
                  if (!newSupporter.fullName.trim()) {
                    setError("Supporter full name is required.");
                    return;
                  }
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
                    setShowSupporterForm(false);
                    setNotice(`Supporter created: ${created.fullName}`);
                    setQ(created.fullName);
                    setAppliedQ(created.fullName);
                    setSupporterPage(1);
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
            <div className="admin-table-head">
              <div className="admin-header-copy">
                <h2 style={{ marginTop: 0 }}>Needs follow-up</h2>
                <p className="muted">{stewardship.watchlist.length} supporters</p>
              </div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Donor</th>
                    <th>Timing</th>
                    <th>Next step</th>
                    <th style={{ width: 120 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stewardship.watchlist.slice(0, 6).map((item) => (
                    <tr key={item.supporterId}>
                      <td>{item.displayName}</td>
                      <td className="muted">
                        {item.recencyDays}d since last gift
                        <br />
                        Expected {item.expectedWindowDays}d
                      </td>
                      <td className="muted">{item.outcomeNarrative}</td>
                      <td>
                        <button className="btn admin-table-action" onClick={() => void openSupporter(item.supporterId)}>
                          Open donor
                        </button>
                      </td>
                    </tr>
                  ))}
                  {stewardship.watchlist.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="muted">No supporters need follow-up right now.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card tone-aqua">
            <div className="admin-table-head">
              <div className="admin-header-copy">
                <h2 style={{ marginTop: 0 }}>Suggested next ask</h2>
                <p className="muted">{stewardship.donorLadderMidTier.length} supporters</p>
              </div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Donor</th>
                    <th>Giving</th>
                    <th>Suggested ask</th>
                    <th style={{ width: 120 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stewardship.donorLadderMidTier.slice(0, 6).map((item) => (
                    <tr key={item.supporterId}>
                      <td>{item.displayName}</td>
                      <td className="muted">
                        PHP {item.totalPhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        <br />
                        {item.giftCount} gifts
                      </td>
                      <td className="muted">{item.ladderPrompt}</td>
                      <td>
                        <button className="btn admin-table-action" onClick={() => void openSupporter(item.supporterId)}>
                          Open donor
                        </button>
                      </td>
                    </tr>
                  ))}
                  {stewardship.donorLadderMidTier.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="muted">No suggested asks right now.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
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
                <th>Type</th>
                <th>Status</th>
                <th>Stewardship</th>
                <th style={{ width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {supporterRows.map((supporter) => {
                const watch = watchMap.get(supporter.supporterId);
                const upgrade = upgradeMap.get(supporter.supporterId);
                const isOpen = selectedSupporter?.supporterId === supporter.supporterId;
                const isClosing = closingSupporter?.supporterId === supporter.supporterId;
                const detailSupporter = isOpen ? selectedSupporter : isClosing ? closingSupporter : null;
                const detailContribs = isOpen ? contribs : isClosing ? closingContribs : null;
                const detailRows = detailContribs?.items ?? [];
                const detailWatch = detailSupporter ? watchMap.get(detailSupporter.supporterId) : null;
                const detailUpgrade = detailSupporter ? upgradeMap.get(detailSupporter.supporterId) : null;
                const detailLastGift = detailRows
                  .filter((row) => row.amount !== null)
                  .sort((a, b) => b.contributionDate.localeCompare(a.contributionDate))[0];

                return (
                  <React.Fragment key={supporter.supporterId}>
                    <tr
                      className={`donor-row-clickable ${isOpen ? "donor-row-selected" : ""}`.trim()}
                      onClick={() => void openSupporter(supporter.supporterId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          void openSupporter(supporter.supporterId);
                        }
                      }}
                      tabIndex={0}
                    >
                      <td data-label="Name">
                        <strong>{supporter.fullName}</strong>
                        <div className="muted" style={{ marginTop: 4 }}>{supporter.email ?? "-"}</div>
                      </td>
                      <td data-label="Type">
                        <span className="badge">{supporter.supporterType}</span>
                      </td>
                      <td data-label="Status">
                        {supporter.isActive ? <span className="badge">Active</span> : <span className="badge">Inactive</span>}
                      </td>
                      <td data-label="Stewardship">
                        <div className="admin-pill-row" style={{ gap: 8 }}>
                          {watch ? <span className="badge danger">Follow-up</span> : null}
                          {upgrade ? <span className="badge ok">Next ask</span> : null}
                          {!watch && !upgrade ? <span className="muted">None</span> : null}
                        </div>
                      </td>
                      <td data-label="Actions">
                        <button
                          className={`btn admin-table-action ${isOpen ? "donor-row-selected-action" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            void openSupporter(supporter.supporterId);
                          }}
                        >
                          {isOpen ? "Hide donor" : "View donor"}
                        </button>
                      </td>
                    </tr>

                    {isOpen || isClosing ? (
                      <tr>
                        <td colSpan={5} style={{ padding: 0 }}>
                          <div className={`donor-inline-panel ${isOpen ? "open" : "closing"}`}>
                          <div style={{ padding: 16, display: "grid", gap: 16 }}>
                            <div className="admin-kpi-grid">
                              <div className="card admin-kpi">
                                <span className="muted">Last gift</span>
                                <strong className="admin-kpi-value" style={{ fontSize: 20 }}>
                                  {detailLastGift?.contributionDate ?? "No gifts"}
                                </strong>
                              </div>
                              <div className="card admin-kpi">
                                <span className="muted">Known total</span>
                                <strong className="admin-kpi-value" style={{ fontSize: 20 }}>
                                  PHP {Math.round(detailUpgrade?.totalPhp ?? detailWatch?.totalPhp ?? 0).toLocaleString()}
                                </strong>
                              </div>
                              <div className="card admin-kpi">
                                <span className="muted">Gift count</span>
                                <strong className="admin-kpi-value" style={{ fontSize: 20 }}>
                                  {detailUpgrade?.giftCount ?? detailContribs?.total ?? 0}
                                </strong>
                              </div>
                            </div>

                            <div className="card tone-cream">
                              <strong>Next step</strong>
                              <div className="muted" style={{ marginTop: 6 }}>
                                {detailWatch?.outcomeNarrative ?? detailUpgrade?.ladderPrompt ?? "Contribution history and supporter details."}
                              </div>
                            </div>

                            {auth.hasRole("Admin") && isOpen ? (
                              <div>
                                <button className="btn primary" onClick={() => setShowContributionForm((open) => !open)}>
                                  {showContributionForm ? "Close" : "Add contribution"}
                                </button>
                                <div
                                  className={`process-collapsible ${showContributionForm ? "open" : ""}`}
                                  aria-hidden={!showContributionForm}
                                >
                                  <div className="card process-form-card" style={{ marginTop: 12 }}>
                                    <div className="process-header process-inline-header">
                                      <strong>Contribution details</strong>
                                    </div>
                                    <div className="admin-inline-grid">
                                      <label className="admin-form-label span-3">
                                        <span className="muted">Type</span>
                                        <select
                                          className="input"
                                          value={newContribution.contributionType}
                                          onChange={(e) => setNewContribution((p) => ({ ...p, contributionType: e.target.value }))}
                                        >
                                          <option value="Monetary">Monetary</option>
                                          <option value="InKind">In-kind</option>
                                          <option value="Time">Time</option>
                                          <option value="Skills">Skills</option>
                                          <option value="Advocacy">Advocacy</option>
                                        </select>
                                      </label>
                                      <label className="admin-form-label span-2">
                                        <span className="muted">Amount</span>
                                        <input
                                          className="input"
                                          value={newContribution.amount}
                                          onChange={(e) => setNewContribution((p) => ({ ...p, amount: e.target.value }))}
                                        />
                                      </label>
                                      <label className="admin-form-label span-2">
                                        <span className="muted">Estimated value</span>
                                        <input
                                          className="input"
                                          value={newContribution.estimatedValue}
                                          onChange={(e) => setNewContribution((p) => ({ ...p, estimatedValue: e.target.value }))}
                                        />
                                      </label>
                                      <label className="admin-form-label span-3">
                                        <span className="muted">Campaign</span>
                                        <input
                                          className="input"
                                          value={newContribution.campaignName}
                                          onChange={(e) => setNewContribution((p) => ({ ...p, campaignName: e.target.value }))}
                                        />
                                      </label>
                                      <label className="admin-form-label span-12">
                                        <span className="muted">Notes</span>
                                        <input
                                          className="input"
                                          value={newContribution.notes}
                                          onChange={(e) => setNewContribution((p) => ({ ...p, notes: e.target.value }))}
                                        />
                                      </label>
                                    </div>
                                    <div className="row process-form-actions" style={{ marginTop: 12, justifyContent: "flex-end" }}>
                                      <button
                                        className="btn primary"
                                        onClick={async () => {
                                          if (!selectedSupporter) return;
                                          try {
                                            await apiFetch<CreatedContribution>("/api/contributions", {
                                              method: "POST",
                                              token: auth.token ?? undefined,
                                              body: JSON.stringify({
                                                supporterId: selectedSupporter.supporterId,
                                                contributionType: newContribution.contributionType,
                                                amount: newContribution.amount.trim() ? Number(newContribution.amount) : null,
                                                estimatedValue: newContribution.estimatedValue.trim()
                                                  ? Number(newContribution.estimatedValue)
                                                  : null,
                                                impactUnit: null,
                                                currency: "PHP",
                                                contributionDate: new Date().toISOString().slice(0, 10),
                                                campaignName: newContribution.campaignName.trim() || null,
                                                notes: newContribution.notes.trim() || null,
                                              }),
                                            });
                                            setNewContribution({
                                              contributionType: "Monetary",
                                              amount: "",
                                              estimatedValue: "",
                                              campaignName: "",
                                              notes: "",
                                            });
                                            setShowContributionForm(false);
                                            setNotice(`Contribution added for ${selectedSupporter.fullName}.`);
                                            await loadContribs(selectedSupporter.supporterId, 1);
                                            setContribPage(1);
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
                              </div>
                            ) : null}

                            <div>
                              <div className="admin-table-head" style={{ marginBottom: 10 }}>
                                <div className="admin-header-copy">
                                  <h2 style={{ marginTop: 0 }}>Contribution history</h2>
                                  <p className="muted">{detailSupporter?.fullName}</p>
                                </div>
                              </div>
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
                                    {detailRows.map((row) => (
                                      <tr key={row.contributionId}>
                                        <td>{row.contributionDate}</td>
                                        <td><span className="badge">{row.contributionType}</span></td>
                                        <td>{row.amount ?? row.estimatedValue ?? 0} {row.currency}</td>
                                        <td className="muted">{row.campaignName ?? "-"}</td>
                                      </tr>
                                    ))}
                                    {detailContribs && detailRows.length === 0 ? (
                                      <tr>
                                        <td colSpan={4} className="muted">No contributions found.</td>
                                      </tr>
                                    ) : null}
                                  </tbody>
                                </table>
                              </div>
                              {isOpen ? (
                                <PaginationControls
                                  page={contribPage}
                                  totalPages={contribTotalPages}
                                  onPrev={() => {
                                    const next = Math.max(1, contribPage - 1);
                                    setContribPage(next);
                                    if (selectedSupporter) void loadContribs(selectedSupporter.supporterId, next);
                                  }}
                                  onNext={() => {
                                    const next = Math.min(contribTotalPages, contribPage + 1);
                                    setContribPage(next);
                                    if (selectedSupporter) void loadContribs(selectedSupporter.supporterId, next);
                                  }}
                                />
                              ) : null}
                            </div>
                          </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                );
              })}

              {data && supporterRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">No supporters found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <PaginationControls
          page={supporterPage}
          totalPages={supporterTotalPages}
          onPrev={() => setSupporterPage((page) => Math.max(1, page - 1))}
          onNext={() => setSupporterPage((page) => Math.min(supporterTotalPages, page + 1))}
        />
      </div>
    </div>
  );
}
