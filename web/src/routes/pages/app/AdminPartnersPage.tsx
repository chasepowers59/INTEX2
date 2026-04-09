import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { RequireRole } from "../../guards";
import { PaginationControls } from "../../../components/ui/PaginationControls";

type Paged<T> = { page: number; pageSize: number; total: number; items: T[] };
type Partner = {
  partnerId: number;
  partnerName: string;
  partnerType: string;
  roleType: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  region: string | null;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
};

type Assignment = {
  assignmentId: number;
  partnerId: number;
  status: string;
  isPrimary: boolean;
};

type PartnerForm = {
  partnerName: string;
  partnerType: string;
  roleType: string;
  contactName: string;
  email: string;
  phone: string;
  region: string;
  status: string;
  notes: string;
};

const emptyPartnerForm: PartnerForm = {
  partnerName: "",
  partnerType: "Organization",
  roleType: "SafehouseOps",
  contactName: "",
  email: "",
  phone: "",
  region: "",
  status: "Active",
  notes: "",
};

export function AdminPartnersPage() {
  const auth = useAuth();
  const PAGE_SIZE = 10;
  const selectedPanelRef = useRef<HTMLDivElement | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [data, setData] = useState<Paged<Partner> | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<PartnerForm>(emptyPartnerForm);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [editForm, setEditForm] = useState<PartnerForm>(emptyPartnerForm);

  const load = async () => {
    setError(null);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (statusFilter.trim()) params.set("status", statusFilter.trim());
    params.set("pageSize", "300");
    const res = await apiFetch<Paged<Partner>>(`/api/partners?${params.toString()}`, { token: auth.token ?? undefined });
    setData(res);
  };

  const loadAssignments = async () => {
    const res = await apiFetch<Paged<Assignment>>("/api/partner-assignments?programArea=&pageSize=500", {
      token: auth.token ?? undefined,
    });
    setAssignments(res.items ?? []);
  };

  useEffect(() => {
    void load().catch((e) => setError((e as Error).message));
    void loadAssignments().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.token]);

  useEffect(() => {
    if (!selectedPartner) return;
    selectedPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedPartner]);

  const assignmentSummary = useMemo(() => {
    const map = new Map<number, { total: number; active: number; primary: number }>();
    for (const assignment of assignments) {
      const current = map.get(assignment.partnerId) ?? { total: 0, active: 0, primary: 0 };
      current.total += 1;
      if (assignment.status === "Active") current.active += 1;
      if (assignment.isPrimary) current.primary += 1;
      map.set(assignment.partnerId, current);
    }
    return map;
  }, [assignments]);

  const roleOptions = useMemo(
    () => Array.from(new Set((data?.items ?? []).map((partner) => partner.roleType).filter(Boolean))).sort(),
    [data?.items]
  );
  const regionOptions = useMemo(
    () => Array.from(new Set((data?.items ?? []).map((partner) => partner.region).filter(Boolean) as string[])).sort(),
    [data?.items]
  );

  const filteredItems = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (data?.items ?? []).filter((partner) => {
      if (query) {
        const haystack = [
          partner.partnerName,
          partner.partnerType,
          partner.roleType,
          partner.contactName ?? "",
          partner.email ?? "",
          partner.phone ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (statusFilter && partner.status !== statusFilter) return false;
      if (roleFilter && partner.roleType !== roleFilter) return false;
      if (regionFilter && (partner.region ?? "") !== regionFilter) return false;
      return true;
    });
  }, [data?.items, q, regionFilter, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const rows = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectPartner = (partner: Partner) => {
    setSelectedPartner(partner);
    setEditForm({
      partnerName: partner.partnerName,
      partnerType: partner.partnerType,
      roleType: partner.roleType,
      contactName: partner.contactName ?? "",
      email: partner.email ?? "",
      phone: partner.phone ?? "",
      region: partner.region ?? "",
      status: partner.status,
      notes: partner.notes ?? "",
    });
    setNotice(`Selected ${partner.partnerName}.`);
  };

  return (
    <RequireRole role="Admin">
      <div className="admin-page">
        <div className="card">
          <div className="admin-header">
            <div className="admin-header-copy">
              <h1 style={{ marginTop: 0 }}>Partners</h1>
              <p className="muted">Organizations, contacts, and current support.</p>
            </div>
            <button
              className="btn primary"
              onClick={() => {
                setShowCreate((open) => !open);
                setCreateForm(emptyPartnerForm);
              }}
            >
              {showCreate ? "Close" : "Add partner"}
            </button>
          </div>
          {error ? <div className="badge danger" style={{ marginTop: 10 }}>{error}</div> : null}
          {notice ? <div className="badge ok" style={{ marginTop: 10 }}>{notice}</div> : null}

          <div className="admin-inline-grid" style={{ marginTop: 10 }}>
            <label className="admin-form-label span-4">
              <span className="muted">Search</span>
              <input
                className="input"
                placeholder="Partner, contact, email, or phone"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <label className="admin-form-label span-2">
              <span className="muted">Status</span>
              <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>
            <label className="admin-form-label span-3">
              <span className="muted">Role</span>
              <select className="input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="">All</option>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-form-label span-3">
              <span className="muted">Region</span>
              <select className="input" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
                <option value="">All</option>
                {regionOptions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn span-2" onClick={() => void load()}>
              Search
            </button>
            <button
              className="btn span-1"
              onClick={() => {
                setQ("");
                setStatusFilter("");
                setRoleFilter("");
                setRegionFilter("");
                setPage(1);
              }}
            >
              Clear filters
            </button>
          </div>

          <div className={`process-collapsible ${showCreate ? "open" : ""}`} aria-hidden={!showCreate}>
            <div className="card process-form-card">
              <div className="process-header process-inline-header">
                <strong>Partner details</strong>
              </div>
              <div className="admin-inline-grid">
                <label className="admin-form-label span-4">
                  <span className="muted">Partner name</span>
                  <input
                    className="input"
                    value={createForm.partnerName}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, partnerName: e.target.value }))}
                  />
                </label>
                <label className="admin-form-label span-3">
                  <span className="muted">Partner type</span>
                  <input
                    className="input"
                    value={createForm.partnerType}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, partnerType: e.target.value }))}
                  />
                </label>
                <label className="admin-form-label span-3">
                  <span className="muted">Role</span>
                  <input
                    className="input"
                    value={createForm.roleType}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, roleType: e.target.value }))}
                  />
                </label>
                <label className="admin-form-label span-2">
                  <span className="muted">Status</span>
                  <select
                    className="input"
                    value={createForm.status}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
                <label className="admin-form-label span-4">
                  <span className="muted">Contact name</span>
                  <input
                    className="input"
                    value={createForm.contactName}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, contactName: e.target.value }))}
                  />
                </label>
                <label className="admin-form-label span-4">
                  <span className="muted">Email</span>
                  <input
                    className="input"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </label>
                <label className="admin-form-label span-4">
                  <span className="muted">Phone</span>
                  <input
                    className="input"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </label>
                <label className="admin-form-label span-4">
                  <span className="muted">Region</span>
                  <input
                    className="input"
                    value={createForm.region}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, region: e.target.value }))}
                  />
                </label>
                <label className="admin-form-label span-8">
                  <span className="muted">Notes</span>
                  <input
                    className="input"
                    value={createForm.notes}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional"
                  />
                </label>
              </div>
              <div className="row process-form-actions" style={{ marginTop: 12, justifyContent: "space-between" }}>
                <button className="btn" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button
                  className="btn primary"
                  disabled={busy}
                  onClick={async () => {
                    if (!createForm.partnerName.trim()) {
                      setError("Partner name is required.");
                      return;
                    }
                    setBusy(true);
                    setError(null);
                    setNotice(null);
                    try {
                      await apiFetch("/api/partners", {
                        method: "POST",
                        token: auth.token ?? undefined,
                        body: JSON.stringify({
                          partnerName: createForm.partnerName.trim(),
                          partnerType: createForm.partnerType.trim() || "Organization",
                          roleType: createForm.roleType.trim() || "SafehouseOps",
                          contactName: createForm.contactName.trim() || null,
                          email: createForm.email.trim() || null,
                          phone: createForm.phone.trim() || null,
                          region: createForm.region.trim() || null,
                          status: createForm.status,
                          notes: createForm.notes.trim() || null,
                        }),
                      });
                      setCreateForm(emptyPartnerForm);
                      setShowCreate(false);
                      setNotice("Partner added.");
                      await load();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Save partner
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          ref={selectedPanelRef}
          className={`process-collapsible user-selected-wrap ${selectedPartner ? "open" : ""}`}
          aria-hidden={!selectedPartner}
        >
          {selectedPartner ? (
            <div key={selectedPartner.partnerId} className="card process-form-card user-selected-panel">
              <div className="admin-header">
                <div className="admin-header-copy">
                  <h2 style={{ marginTop: 0 }}>Selected partner</h2>
                  <p className="muted">{selectedPartner.partnerName}</p>
                </div>
                <button
                  className="btn"
                  onClick={() => {
                    setSelectedPartner(null);
                    setNotice(null);
                  }}
                >
                  Clear selection
                </button>
              </div>

              <div className="admin-kpi-grid" style={{ marginTop: 8 }}>
                <div className="card admin-kpi tone-cream">
                  <div className="muted">Status</div>
                  <div className="admin-kpi-value" style={{ fontSize: 22 }}>{selectedPartner.status}</div>
                </div>
                <div className="card admin-kpi tone-cream">
                  <div className="muted">Role</div>
                  <div className="admin-kpi-value" style={{ fontSize: 20 }}>{selectedPartner.roleType || "-"}</div>
                </div>
                <div className="card admin-kpi tone-cream">
                  <div className="muted">Active assignments</div>
                  <div className="admin-kpi-value" style={{ fontSize: 22 }}>{assignmentSummary.get(selectedPartner.partnerId)?.active ?? 0}</div>
                </div>
                <div className="card admin-kpi tone-cream">
                  <div className="muted">Primary assignments</div>
                  <div className="admin-kpi-value" style={{ fontSize: 22 }}>{assignmentSummary.get(selectedPartner.partnerId)?.primary ?? 0}</div>
                </div>
              </div>

              <div className="admin-two-column" style={{ marginTop: 12 }}>
                <div className="card" style={{ boxShadow: "none" }}>
                  <div className="admin-header-copy">
                    <h3 style={{ marginTop: 0 }}>Partner details</h3>
                    <p className="muted">Contact information and notes.</p>
                  </div>
                  <div className="admin-inline-grid" style={{ marginTop: 10 }}>
                    <label className="admin-form-label span-4">
                      <span className="muted">Partner name</span>
                      <input
                        className="input"
                        value={editForm.partnerName}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, partnerName: e.target.value }))}
                      />
                    </label>
                    <label className="admin-form-label span-3">
                      <span className="muted">Partner type</span>
                      <input
                        className="input"
                        value={editForm.partnerType}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, partnerType: e.target.value }))}
                      />
                    </label>
                    <label className="admin-form-label span-3">
                      <span className="muted">Role</span>
                      <input
                        className="input"
                        value={editForm.roleType}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, roleType: e.target.value }))}
                      />
                    </label>
                    <label className="admin-form-label span-2">
                      <span className="muted">Status</span>
                      <select
                        className="input"
                        value={editForm.status}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </label>
                    <label className="admin-form-label span-4">
                      <span className="muted">Contact name</span>
                      <input
                        className="input"
                        value={editForm.contactName}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, contactName: e.target.value }))}
                      />
                    </label>
                    <label className="admin-form-label span-4">
                      <span className="muted">Email</span>
                      <input
                        className="input"
                        value={editForm.email}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </label>
                    <label className="admin-form-label span-4">
                      <span className="muted">Phone</span>
                      <input
                        className="input"
                        value={editForm.phone}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                      />
                    </label>
                    <label className="admin-form-label span-4">
                      <span className="muted">Region</span>
                      <input
                        className="input"
                        value={editForm.region}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, region: e.target.value }))}
                      />
                    </label>
                    <label className="admin-form-label span-8">
                      <span className="muted">Notes</span>
                      <input
                        className="input"
                        value={editForm.notes}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                        placeholder="Optional"
                      />
                    </label>
                  </div>
                </div>

                <div className="card" style={{ boxShadow: "none" }}>
                  <div className="admin-header-copy">
                    <h3 style={{ marginTop: 0 }}>Assignments</h3>
                    <p className="muted">Current assignments and actions.</p>
                  </div>
                  <div className="admin-mini-list" style={{ marginTop: 10 }}>
                    <div className="admin-mini-list-item">
                      <span className="muted">Total assignments</span>
                      <strong>{assignmentSummary.get(selectedPartner.partnerId)?.total ?? 0}</strong>
                    </div>
                    <div className="admin-mini-list-item">
                      <span className="muted">Active assignments</span>
                      <strong>{assignmentSummary.get(selectedPartner.partnerId)?.active ?? 0}</strong>
                    </div>
                    <div className="admin-mini-list-item">
                      <span className="muted">Primary assignments</span>
                      <strong>{assignmentSummary.get(selectedPartner.partnerId)?.primary ?? 0}</strong>
                    </div>
                  </div>
                  <div className="row process-form-actions" style={{ marginTop: 12, justifyContent: "space-between" }}>
                    <Link className="btn" to="/app/admin/partner-assignments">
                      Open assignments
                    </Link>
                    <button
                      className="btn primary"
                      disabled={busy}
                      onClick={async () => {
                        if (!selectedPartner) return;
                        if (!editForm.partnerName.trim()) {
                          setError("Partner name is required.");
                          return;
                        }
                        setBusy(true);
                        setError(null);
                        setNotice(null);
                        try {
                          await apiFetch(`/api/partners/${selectedPartner.partnerId}`, {
                            method: "PUT",
                            token: auth.token ?? undefined,
                            body: JSON.stringify({
                              ...selectedPartner,
                              partnerName: editForm.partnerName.trim(),
                              partnerType: editForm.partnerType.trim() || "Organization",
                              roleType: editForm.roleType.trim() || "SafehouseOps",
                              contactName: editForm.contactName.trim() || null,
                              email: editForm.email.trim() || null,
                              phone: editForm.phone.trim() || null,
                              region: editForm.region.trim() || null,
                              status: editForm.status,
                              notes: editForm.notes.trim() || null,
                            }),
                          });
                          const updatedPartner = {
                            ...selectedPartner,
                            partnerName: editForm.partnerName.trim(),
                            partnerType: editForm.partnerType.trim() || "Organization",
                            roleType: editForm.roleType.trim() || "SafehouseOps",
                            contactName: editForm.contactName.trim() || null,
                            email: editForm.email.trim() || null,
                            phone: editForm.phone.trim() || null,
                            region: editForm.region.trim() || null,
                            status: editForm.status,
                            notes: editForm.notes.trim() || null,
                          };
                          setSelectedPartner(updatedPartner);
                          setNotice("Partner updated.");
                          await load();
                        } catch (e) {
                          setError((e as Error).message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Save changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="card">
          <div className="admin-table-head">
            <div className="admin-header-copy">
              <h2 style={{ marginTop: 0 }}>Partner directory</h2>
              <p className="muted">Contact details, role, and current status.</p>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Partner</th>
                  <th>Contact</th>
                  <th>Role</th>
                  <th>Region</th>
                  <th>Status</th>
                  <th>Assignments</th>
                  <th style={{ width: 180 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((partner) => {
                  const summary = assignmentSummary.get(partner.partnerId);
                  const isSelected = selectedPartner?.partnerId === partner.partnerId;
                  return (
                    <tr key={partner.partnerId} className={isSelected ? "donor-row-selected" : undefined}>
                      <td data-label="Partner" style={{ fontWeight: 800 }}>
                        {partner.partnerName}
                        <div className="muted">{partner.partnerType}</div>
                      </td>
                      <td data-label="Contact" className="muted">
                        <div>{partner.contactName ?? "-"}</div>
                        <div>{partner.email ?? partner.phone ?? "-"}</div>
                      </td>
                      <td data-label="Role">
                        <span className="badge">{partner.roleType}</span>
                      </td>
                      <td data-label="Region" className="muted">{partner.region ?? "-"}</td>
                      <td data-label="Status">
                        <span className={`badge ${partner.status === "Active" ? "ok" : "warn"}`}>{partner.status}</span>
                      </td>
                      <td data-label="Assignments" className="muted">
                        {summary ? `${summary.active} active / ${summary.total} total` : "0"}
                      </td>
                      <td data-label="Actions">
                        <div className="row admin-compact-actions">
                          <button
                            className={`btn admin-table-action ${isSelected ? "donor-row-selected-action" : ""}`}
                            onClick={() => selectPartner(partner)}
                          >
                            {isSelected ? "Selected" : "Manage"}
                          </button>
                          <button
                            className="btn danger admin-table-action"
                            disabled={busy}
                            onClick={async () => {
                              if (!confirm("Delete partner?")) return;
                              setBusy(true);
                              setError(null);
                              try {
                                await apiFetch(`/api/partners/${partner.partnerId}?confirm=true`, {
                                  method: "DELETE",
                                  token: auth.token ?? undefined,
                                });
                                if (selectedPartner?.partnerId === partner.partnerId) {
                                  setSelectedPartner(null);
                                }
                                setNotice("Partner deleted.");
                                await load();
                                await loadAssignments();
                              } catch (e) {
                                setError((e as Error).message);
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted">No partners found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <PaginationControls
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
          />
        </div>
      </div>
    </RequireRole>
  );
}
