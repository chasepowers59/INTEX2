import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { RequireRole } from "../../guards";
import { PaginationControls } from "../../../components/ui/PaginationControls";

type Paged<T> = { page: number; pageSize: number; total: number; items: T[] };
type Partner = { partnerId: number; partnerName: string };
type SafehouseOption = { safehouseId: number; safehouseName: string };
type Assignment = {
  assignmentId: number;
  partnerId: number;
  partnerName: string;
  safehouseId: number | null;
  safehouseName: string | null;
  programArea: string;
  assignmentStart: string | null;
  assignmentEnd: string | null;
  responsibilityNotes?: string | null;
  status: string;
  isPrimary: boolean;
};

type AssignmentForm = {
  partnerId: string;
  safehouseId: string;
  programArea: string;
  status: string;
  isPrimary: boolean;
  assignmentStart: string;
  assignmentEnd: string;
  responsibilityNotes: string;
};

const PROGRAM_AREAS = ["CaseManagement", "Counseling", "SafehouseOps", "Education", "Health", "SocialMedia", "Reintegration"] as const;
const PROGRAM_AREA_LABELS: Record<string, string> = {
  CaseManagement: "Case management",
  Counseling: "Counseling",
  SafehouseOps: "Safehouse operations",
  Education: "Education",
  Health: "Health",
  SocialMedia: "Social media",
  Reintegration: "Reintegration",
};
const emptyForm: AssignmentForm = {
  partnerId: "",
  safehouseId: "",
  programArea: "CaseManagement",
  status: "Active",
  isPrimary: false,
  assignmentStart: "",
  assignmentEnd: "",
  responsibilityNotes: "",
};

function labelProgramArea(value: string) {
  return PROGRAM_AREA_LABELS[value] ?? value;
}

export function AdminPartnerAssignmentsPage() {
  const auth = useAuth();
  const PAGE_SIZE = 10;
  const selectedPanelRef = useRef<HTMLDivElement | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [safehouses, setSafehouses] = useState<SafehouseOption[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [partnerFilter, setPartnerFilter] = useState("");
  const [programAreaFilter, setProgramAreaFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<AssignmentForm>(emptyForm);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [editForm, setEditForm] = useState<AssignmentForm>(emptyForm);

  const loadAssignments = async () => {
    const res = await apiFetch<Paged<Assignment>>("/api/partner-assignments?pageSize=500", {
      token: auth.token ?? undefined,
    });
    setAssignments(res.items ?? []);
  };

  useEffect(() => {
    void apiFetch<Paged<Partner>>("/api/partners?pageSize=300", { token: auth.token ?? undefined })
      .then((res) => setPartners(res.items ?? []))
      .catch(() => {});
    void apiFetch<Paged<SafehouseOption>>("/api/residents?page=1&pageSize=300", { token: auth.token ?? undefined })
      .then((res) => {
        const options = [...new Map((res.items ?? []).map((row) => [row.safehouseId, { safehouseId: row.safehouseId, safehouseName: row.safehouseName }])).values()]
          .sort((a, b) => a.safehouseName.localeCompare(b.safehouseName));
        setSafehouses(options);
      })
      .catch(() => {});
    void loadAssignments().catch((e) => setError((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.token]);

  useEffect(() => {
    if (!selectedAssignment) return;
    selectedPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedAssignment]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      if (partnerFilter && !assignment.partnerName.toLowerCase().includes(partnerFilter.toLowerCase())) return false;
      if (programAreaFilter && assignment.programArea !== programAreaFilter) return false;
      if (statusFilter && assignment.status !== statusFilter) return false;
      return true;
    });
  }, [assignments, partnerFilter, programAreaFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / PAGE_SIZE));
  const rows = filteredAssignments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeAssignments = assignments.filter((assignment) => assignment.status === "Active");
  const assignedPartners = new Set(activeAssignments.map((assignment) => assignment.partnerId)).size;
  const coveredPrograms = new Set(activeAssignments.map((assignment) => assignment.programArea)).size;
  const programAreaOptions = useMemo(
    () => Array.from(new Set(assignments.map((assignment) => assignment.programArea).filter(Boolean))).sort(),
    [assignments]
  );

  const selectAssignment = (assignment: Assignment) => {
    if (selectedAssignment?.assignmentId === assignment.assignmentId) {
      setSelectedAssignment(null);
      setNotice(null);
      return;
    }
    setSelectedAssignment(assignment);
    setEditForm({
      partnerId: String(assignment.partnerId),
      safehouseId: assignment.safehouseId == null ? "" : String(assignment.safehouseId),
      programArea: assignment.programArea,
      status: assignment.status,
      isPrimary: assignment.isPrimary,
      assignmentStart: assignment.assignmentStart ?? "",
      assignmentEnd: assignment.assignmentEnd ?? "",
      responsibilityNotes: assignment.responsibilityNotes ?? "",
    });
    setNotice(`Selected ${assignment.partnerName}.`);
  };

  const clearFilters = () => {
    setPartnerFilter("");
    setProgramAreaFilter("");
    setStatusFilter("");
    setPage(1);
  };

  return (
    <RequireRole role="Admin">
      <div className="admin-page">
        <div className="card">
          <div className="admin-header">
            <div className="admin-header-copy">
              <h1 style={{ marginTop: 0 }}>Partner assignments</h1>
              <p className="muted">Where partners are currently helping.</p>
            </div>
            <button className="btn primary" onClick={() => { setShowCreate((open) => !open); setCreateForm(emptyForm); }}>
              {showCreate ? "Cancel" : "Add assignment"}
            </button>
          </div>
          {error ? <div className="badge danger" style={{ marginTop: 10 }}>{error}</div> : null}
          {notice ? <div className="badge ok" style={{ marginTop: 10 }}>{notice}</div> : null}

          <div className="admin-kpi-grid" style={{ marginTop: 12 }}>
            <div className="card admin-kpi tone-cream"><div className="muted">Active assignments</div><div className="admin-kpi-value">{activeAssignments.length}</div></div>
            <div className="card admin-kpi tone-cream"><div className="muted">Partners assigned</div><div className="admin-kpi-value">{assignedPartners}</div></div>
            <div className="card admin-kpi tone-cream"><div className="muted">Program areas covered</div><div className="admin-kpi-value">{coveredPrograms}</div></div>
          </div>

          <div className="admin-inline-grid" style={{ marginTop: 12 }}>
            <label className="admin-form-label span-4"><span className="muted">Partner</span><input className="input" value={partnerFilter} onChange={(e) => setPartnerFilter(e.target.value)} placeholder="Search partner name..." /></label>
            <label className="admin-form-label span-3"><span className="muted">Program area</span><select className="input" value={programAreaFilter} onChange={(e) => setProgramAreaFilter(e.target.value)}><option value="">All</option>{programAreaOptions.map((value) => <option key={value} value={value}>{labelProgramArea(value)}</option>)}</select></label>
            <label className="admin-form-label span-2"><span className="muted">Status</span><select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">All</option><option value="Active">Active</option><option value="Inactive">Inactive</option></select></label>
            <button className="btn span-2" onClick={clearFilters}>Clear</button>
          </div>

          <div className={`process-collapsible ${showCreate ? "open" : ""}`} aria-hidden={!showCreate}>
            <div className="card process-form-card">
              <div className="process-header process-inline-header"><strong>Assignment info</strong></div>
              <div className="admin-inline-grid">
                <label className="admin-form-label span-4"><span className="muted">Partner</span><select className="input" value={createForm.partnerId} onChange={(e) => setCreateForm((prev) => ({ ...prev, partnerId: e.target.value }))}><option value="">Select partner</option>{partners.map((partner) => <option key={partner.partnerId} value={partner.partnerId}>{partner.partnerName}</option>)}</select></label>
                <label className="admin-form-label span-3"><span className="muted">Safehouse</span><select className="input" value={createForm.safehouseId} onChange={(e) => setCreateForm((prev) => ({ ...prev, safehouseId: e.target.value }))}><option value="">Shared support</option>{safehouses.map((safehouse) => <option key={safehouse.safehouseId} value={safehouse.safehouseId}>{safehouse.safehouseName}</option>)}</select></label>
                <label className="admin-form-label span-3"><span className="muted">Program area</span><select className="input" value={createForm.programArea} onChange={(e) => setCreateForm((prev) => ({ ...prev, programArea: e.target.value }))}>{PROGRAM_AREAS.map((value) => <option key={value} value={value}>{labelProgramArea(value)}</option>)}</select></label>
                <label className="admin-form-label span-2"><span className="muted">Status</span><select className="input" value={createForm.status} onChange={(e) => setCreateForm((prev) => ({ ...prev, status: e.target.value }))}><option value="Active">Active</option><option value="Inactive">Inactive</option></select></label>
                <label className="admin-form-label span-3"><span className="muted">Start date</span><input className="input" type="date" value={createForm.assignmentStart} onChange={(e) => setCreateForm((prev) => ({ ...prev, assignmentStart: e.target.value }))} /></label>
                <label className="admin-form-label span-3"><span className="muted">End date</span><input className="input" type="date" value={createForm.assignmentEnd} onChange={(e) => setCreateForm((prev) => ({ ...prev, assignmentEnd: e.target.value }))} /></label>
                <label className="admin-form-label span-6"><span className="muted">Responsibility notes</span><input className="input" value={createForm.responsibilityNotes} onChange={(e) => setCreateForm((prev) => ({ ...prev, responsibilityNotes: e.target.value }))} placeholder="Optional" /></label>
                <label className="row span-12" style={{ alignItems: "center" }}><input type="checkbox" checked={createForm.isPrimary} onChange={(e) => setCreateForm((prev) => ({ ...prev, isPrimary: e.target.checked }))} />Primary assignment</label>
              </div>
              <div className="row process-form-actions" style={{ marginTop: 12, justifyContent: "space-between" }}>
                <button className="btn" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn primary" disabled={busy} onClick={async () => {
                  const partnerId = Number(createForm.partnerId);
                  if (!Number.isFinite(partnerId)) return setError("Partner selection is required.");
                  setBusy(true); setError(null); setNotice(null);
                  try {
                    await apiFetch("/api/partner-assignments", { method: "POST", token: auth.token ?? undefined, body: JSON.stringify({
                      partnerId,
                      safehouseId: createForm.safehouseId.trim() ? Number(createForm.safehouseId) : null,
                      programArea: createForm.programArea.trim() || "CaseManagement",
                      assignmentStart: createForm.assignmentStart || null,
                      assignmentEnd: createForm.assignmentEnd || null,
                      responsibilityNotes: createForm.responsibilityNotes.trim() || null,
                      status: createForm.status,
                      isPrimary: createForm.isPrimary,
                    })});
                    setCreateForm(emptyForm); setShowCreate(false); setNotice("Assignment added."); await loadAssignments();
                  } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
                }}>Save assignment</button>
              </div>
            </div>
          </div>
        </div>
        <div ref={selectedPanelRef} className={`process-collapsible user-selected-wrap ${selectedAssignment ? "open" : ""}`} aria-hidden={!selectedAssignment}>
          {selectedAssignment ? (
            <div key={selectedAssignment.assignmentId} className="card process-form-card user-selected-panel">
              <div className="admin-header">
                <div className="admin-header-copy">
                  <h2 style={{ marginTop: 0 }}>Selected assignment</h2>
                  <p className="muted">{selectedAssignment.partnerName}</p>
                </div>
                <button className="btn" onClick={() => { setSelectedAssignment(null); setNotice(null); }}>Cancel</button>
              </div>
              <div className="admin-kpi-grid" style={{ marginTop: 8 }}>
                <div className="card admin-kpi tone-cream"><div className="muted">Program area</div><div className="admin-kpi-value" style={{ fontSize: 20 }}>{labelProgramArea(selectedAssignment.programArea)}</div></div>
                <div className="card admin-kpi tone-cream"><div className="muted">Safehouse</div><div className="admin-kpi-value" style={{ fontSize: 20 }}>{selectedAssignment.safehouseName ?? "Shared support"}</div></div>
                <div className="card admin-kpi tone-cream"><div className="muted">Status</div><div className="admin-kpi-value" style={{ fontSize: 22 }}>{selectedAssignment.status}</div></div>
                <div className="card admin-kpi tone-cream"><div className="muted">Primary</div><div className="admin-kpi-value" style={{ fontSize: 22 }}>{selectedAssignment.isPrimary ? "Yes" : "No"}</div></div>
              </div>
              <div className="admin-two-column" style={{ marginTop: 12 }}>
                <div className="card" style={{ boxShadow: "none" }}>
                  <div className="admin-header-copy">
                    <h3 style={{ marginTop: 0 }}>Assignment details</h3>
                    <p className="muted">Area, dates, and notes.</p>
                  </div>
                  <div className="admin-inline-grid" style={{ marginTop: 10 }}>
                    <label className="admin-form-label span-4"><span className="muted">Partner</span><select className="input" value={editForm.partnerId} onChange={(e) => setEditForm((prev) => ({ ...prev, partnerId: e.target.value }))}>{partners.map((partner) => <option key={partner.partnerId} value={partner.partnerId}>{partner.partnerName}</option>)}</select></label>
                    <label className="admin-form-label span-3"><span className="muted">Safehouse</span><select className="input" value={editForm.safehouseId} onChange={(e) => setEditForm((prev) => ({ ...prev, safehouseId: e.target.value }))}><option value="">Shared support</option>{safehouses.map((safehouse) => <option key={safehouse.safehouseId} value={safehouse.safehouseId}>{safehouse.safehouseName}</option>)}</select></label>
                    <label className="admin-form-label span-3"><span className="muted">Program area</span><select className="input" value={editForm.programArea} onChange={(e) => setEditForm((prev) => ({ ...prev, programArea: e.target.value }))}>{PROGRAM_AREAS.map((value) => <option key={value} value={value}>{labelProgramArea(value)}</option>)}</select></label>
                    <label className="admin-form-label span-2"><span className="muted">Status</span><select className="input" value={editForm.status} onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}><option value="Active">Active</option><option value="Inactive">Inactive</option></select></label>
                    <label className="admin-form-label span-3"><span className="muted">Start date</span><input className="input" type="date" value={editForm.assignmentStart} onChange={(e) => setEditForm((prev) => ({ ...prev, assignmentStart: e.target.value }))} /></label>
                    <label className="admin-form-label span-3"><span className="muted">End date</span><input className="input" type="date" value={editForm.assignmentEnd} onChange={(e) => setEditForm((prev) => ({ ...prev, assignmentEnd: e.target.value }))} /></label>
                    <label className="admin-form-label span-6"><span className="muted">Responsibility notes</span><input className="input" value={editForm.responsibilityNotes} onChange={(e) => setEditForm((prev) => ({ ...prev, responsibilityNotes: e.target.value }))} placeholder="Optional" /></label>
                    <label className="row span-12" style={{ alignItems: "center" }}><input type="checkbox" checked={editForm.isPrimary} onChange={(e) => setEditForm((prev) => ({ ...prev, isPrimary: e.target.checked }))} />Primary assignment</label>
                  </div>
                </div>
                <div className="card" style={{ boxShadow: "none" }}>
                  <div className="admin-header-copy">
                    <h3 style={{ marginTop: 0 }}>Coverage actions</h3>
                    <p className="muted">Update this assignment or open the partner record.</p>
                  </div>
                  <div className="admin-mini-list" style={{ marginTop: 10 }}>
                    <div className="admin-mini-list-item"><span className="muted">Partner</span><strong>{selectedAssignment.partnerName}</strong></div>
                    <div className="admin-mini-list-item"><span className="muted">Safehouse</span><strong>{selectedAssignment.safehouseName ?? "Shared support"}</strong></div>
                    <div className="admin-mini-list-item"><span className="muted">Program area</span><strong>{labelProgramArea(selectedAssignment.programArea)}</strong></div>
                  </div>
                  <div className="row process-form-actions" style={{ marginTop: 12, justifyContent: "space-between" }}>
                    <Link className="btn" to="/app/admin/partners">Open partners</Link>
                    <div className="row admin-compact-actions">
                      <button className="btn danger admin-table-action" disabled={busy} onClick={async () => {
                        if (!selectedAssignment || !confirm("Delete assignment?")) return;
                        setBusy(true); setError(null); setNotice(null);
                        try {
                          await apiFetch(`/api/partner-assignments/${selectedAssignment.assignmentId}?confirm=true`, { method: "DELETE", token: auth.token ?? undefined });
                          setSelectedAssignment(null); setNotice("Assignment deleted."); await loadAssignments();
                        } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
                      }}>Delete</button>
                      <button className="btn primary" disabled={busy} onClick={async () => {
                        if (!selectedAssignment) return;
                        const partnerId = Number(editForm.partnerId);
                        if (!Number.isFinite(partnerId)) return setError("Partner selection is required.");
                        setBusy(true); setError(null); setNotice(null);
                        try {
                          await apiFetch(`/api/partner-assignments/${selectedAssignment.assignmentId}`, { method: "PUT", token: auth.token ?? undefined, body: JSON.stringify({
                            ...selectedAssignment,
                            partnerId,
                            safehouseId: editForm.safehouseId.trim() ? Number(editForm.safehouseId) : null,
                            programArea: editForm.programArea.trim(),
                            assignmentStart: editForm.assignmentStart || null,
                            assignmentEnd: editForm.assignmentEnd || null,
                            responsibilityNotes: editForm.responsibilityNotes.trim() || null,
                            status: editForm.status,
                            isPrimary: editForm.isPrimary,
                          })});
                          const updatedPartnerName = partners.find((partner) => partner.partnerId === partnerId)?.partnerName ?? selectedAssignment.partnerName;
                          setSelectedAssignment({
                            ...selectedAssignment,
                            partnerId,
                            partnerName: updatedPartnerName,
                            safehouseId: editForm.safehouseId.trim() ? Number(editForm.safehouseId) : null,
                            safehouseName: editForm.safehouseId.trim() ? safehouses.find((safehouse) => String(safehouse.safehouseId) === editForm.safehouseId)?.safehouseName ?? null : null,
                            programArea: editForm.programArea.trim(),
                            assignmentStart: editForm.assignmentStart || null,
                            assignmentEnd: editForm.assignmentEnd || null,
                            responsibilityNotes: editForm.responsibilityNotes.trim() || null,
                            status: editForm.status,
                            isPrimary: editForm.isPrimary,
                          });
                          setNotice("Assignment updated.");
                          await loadAssignments();
                        } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
                      }}>Save changes</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="card">
          <div className="admin-table-head">
            <div className="admin-header-copy">
              <h2 style={{ marginTop: 0 }}>Coverage</h2>
              <p className="muted">Current assignments by partner and area.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Partner</th>
                  <th>Safehouse</th>
                  <th>Program area</th>
                  <th>Status</th>
                  <th>Primary</th>
                  <th>Dates</th>
                  <th style={{ width: 180 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((assignment) => {
                  const isSelected = selectedAssignment?.assignmentId === assignment.assignmentId;
                  return (
                    <tr key={assignment.assignmentId} className={isSelected ? "donor-row-selected" : undefined}>
                      <td data-label="Partner" style={{ fontWeight: 700 }}>{assignment.partnerName}</td>
                      <td data-label="Safehouse" className="muted">{assignment.safehouseName ?? (assignment.safehouseId ?? "Shared support")}</td>
                      <td data-label="Program area"><span className="badge">{labelProgramArea(assignment.programArea)}</span></td>
                      <td data-label="Status"><span className={`badge ${assignment.status === "Active" ? "ok" : "warn"}`}>{assignment.status}</span></td>
                      <td data-label="Primary">{assignment.isPrimary ? "Yes" : "No"}</td>
                      <td data-label="Dates" className="muted">{assignment.assignmentStart || assignment.assignmentEnd ? `${assignment.assignmentStart ?? "Start open"} - ${assignment.assignmentEnd ?? "Current"}` : "-"}</td>
                      <td data-label="Actions"><button className={`btn admin-table-action ${isSelected ? "donor-row-selected-action" : ""}`} onClick={() => selectAssignment(assignment)}>{isSelected ? "Selected" : "Manage"}</button></td>
                    </tr>
                  );
                })}
                {rows.length === 0 ? <tr><td colSpan={7} className="muted">No assignments found.</td></tr> : null}
              </tbody>
            </table>
          </div>
          <PaginationControls page={page} totalPages={totalPages} onPrev={() => setPage((current) => Math.max(1, current - 1))} onNext={() => setPage((current) => Math.min(totalPages, current + 1))} />
        </div>
      </div>
    </RequireRole>
  );
}
