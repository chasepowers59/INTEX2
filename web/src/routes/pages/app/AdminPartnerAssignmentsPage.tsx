import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { RequireRole } from "../../guards";
import { PaginationControls } from "../../../components/ui/PaginationControls";

type Paged<T> = { page: number; pageSize: number; total: number; items: T[] };
type Partner = { partnerId: number; partnerName: string };
type Assignment = {
  assignmentId: number;
  partnerId: number;
  partnerName: string;
  safehouseId: number | null;
  safehouseName: string | null;
  programArea: string;
  assignmentStart: string | null;
  assignmentEnd: string | null;
  status: string;
  isPrimary: boolean;
};

const PROGRAM_AREAS = [
  "CaseManagement",
  "Counseling",
  "SafehouseOps",
  "Education",
  "Health",
  "SocialMedia",
  "Reintegration",
];

export function AdminPartnerAssignmentsPage() {
  const auth = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [data, setData] = useState<Paged<Assignment> | null>(null);
  const [programArea, setProgramArea] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [createForm, setCreateForm] = useState({
    partnerId: "",
    safehouseId: "",
    programArea: "CaseManagement",
    status: "Active",
    isPrimary: false,
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    safehouseId: "",
    programArea: "",
    status: "Active",
    isPrimary: false,
  });

  const load = async () => {
    const res = await apiFetch<Paged<Assignment>>(`/api/partner-assignments?programArea=${encodeURIComponent(programArea)}`, {
      token: auth.token ?? undefined,
    });
    setData(res);
  };

  useEffect(() => {
    void apiFetch<Paged<Partner>>("/api/partners?pageSize=300", { token: auth.token ?? undefined }).then((x) => setPartners(x.items));
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = (data?.items ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil((data?.items.length ?? 0) / PAGE_SIZE));

  return (
    <RequireRole role="Admin">
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Partner assignments</h1>
        <p className="muted">Connect partner organizations to safehouses and program areas for clear operational coverage.</p>
        <div className="row" style={{ marginTop: 10 }}>
          <div className="card tone-aqua" style={{ boxShadow: "none", flex: "1 1 260px" }}>
            <div style={{ fontWeight: 800 }}>Workflow</div>
            <ol className="trust-list muted">
              <li>Create the partner on the Partners page first.</li>
              <li>Assign the partner to the right safehouse or leave it shared across sites.</li>
              <li>Mark one primary assignment when a lead organization is responsible.</li>
            </ol>
          </div>
          <div className="card tone-peach" style={{ boxShadow: "none", flex: "1 1 260px" }}>
            <div style={{ fontWeight: 800 }}>Interpretation</div>
            <ol className="trust-list muted">
              <li>Safehouse blank means the partner supports more than one site.</li>
              <li>Status controls whether staff should still route work to the partner.</li>
              <li>Program area should stay broad and consistent across assignments.</li>
            </ol>
          </div>
        </div>
        {error ? <div className="badge danger">{error}</div> : null}

        <div className="row" style={{ marginTop: 10, alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6, minWidth: 240 }}>
            <span className="muted">Filter program area</span>
            <input
              className="input"
              list="assignment-program-areas"
              value={programArea}
              onChange={(e) => setProgramArea(e.target.value)}
              placeholder="Leave blank for all"
            />
          </label>
          <button className="btn" onClick={() => void load()}>
            Apply filter
          </button>
        </div>

        <div className="row" style={{ marginTop: 10, alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6, minWidth: 260, flex: 1 }}>
            <span className="muted">Partner</span>
            <select className="input" value={createForm.partnerId} onChange={(e) => setCreateForm((p) => ({ ...p, partnerId: e.target.value }))}>
              <option value="">Select partner</option>
              {partners.map((partner) => (
                <option key={partner.partnerId} value={partner.partnerId}>
                  {partner.partnerName} (#{partner.partnerId})
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6, minWidth: 180 }}>
            <span className="muted">Safehouse ID</span>
            <input
              className="input"
              placeholder="Optional"
              value={createForm.safehouseId}
              onChange={(e) => setCreateForm((p) => ({ ...p, safehouseId: e.target.value }))}
            />
          </label>
          <label style={{ display: "grid", gap: 6, minWidth: 220 }}>
            <span className="muted">Program area</span>
            <input
              className="input"
              list="assignment-program-areas"
              value={createForm.programArea}
              onChange={(e) => setCreateForm((p) => ({ ...p, programArea: e.target.value }))}
            />
          </label>
          <label style={{ display: "grid", gap: 6, minWidth: 160 }}>
            <span className="muted">Status</span>
            <select className="input" value={createForm.status} onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value }))}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>
          <label className="row" style={{ alignSelf: "end" }}>
            <input type="checkbox" checked={createForm.isPrimary} onChange={(e) => setCreateForm((p) => ({ ...p, isPrimary: e.target.checked }))} />
            Primary assignment
          </label>
          <button
            className="btn primary"
            onClick={async () => {
              const partnerId = Number(createForm.partnerId);
              if (!Number.isFinite(partnerId)) return setError("Partner selection is required.");
              try {
                await apiFetch("/api/partner-assignments", {
                  method: "POST",
                  token: auth.token ?? undefined,
                  body: JSON.stringify({
                    partnerId,
                    safehouseId: createForm.safehouseId.trim() ? Number(createForm.safehouseId) : null,
                    programArea: createForm.programArea.trim() || "CaseManagement",
                    status: createForm.status,
                    isPrimary: createForm.isPrimary,
                  }),
                });
                setCreateForm({ partnerId: "", safehouseId: "", programArea: "CaseManagement", status: "Active", isPrimary: false });
                await load();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Save assignment
          </button>
        </div>

        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Partner</th>
                <th>Safehouse</th>
                <th>Program area</th>
                <th>Status</th>
                <th>Primary</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((assignment) => (
                <tr key={assignment.assignmentId}>
                  <td data-label="Partner" style={{ fontWeight: 700 }}>{assignment.partnerName}</td>
                  <td data-label="Safehouse" className="muted">{assignment.safehouseName ?? (assignment.safehouseId ?? "Shared")}</td>
                  <td data-label="Program area"><span className="badge">{assignment.programArea}</span></td>
                  <td data-label="Status">{assignment.status}</td>
                  <td data-label="Primary">{assignment.isPrimary ? "Yes" : "No"}</td>
                  <td data-label="Actions">
                    <div className="row">
                      <button
                        className="btn"
                        onClick={() => {
                          setEditId(assignment.assignmentId);
                          setEditForm({
                            safehouseId: assignment.safehouseId?.toString() ?? "",
                            programArea: assignment.programArea,
                            status: assignment.status,
                            isPrimary: assignment.isPrimary,
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn danger"
                        onClick={async () => {
                          if (!confirm("Delete assignment?")) return;
                          try {
                            await apiFetch(`/api/partner-assignments/${assignment.assignmentId}?confirm=true`, {
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
                  </td>
                </tr>
              ))}
              {editId !== null ? (
                <tr>
                  <td className="muted">Editing #{editId}</td>
                  <td>
                    <input className="input" value={editForm.safehouseId} onChange={(e) => setEditForm((x) => ({ ...x, safehouseId: e.target.value }))} />
                  </td>
                  <td>
                    <input className="input" list="assignment-program-areas" value={editForm.programArea} onChange={(e) => setEditForm((x) => ({ ...x, programArea: e.target.value }))} />
                  </td>
                  <td>
                    <select className="input" value={editForm.status} onChange={(e) => setEditForm((x) => ({ ...x, status: e.target.value }))}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </td>
                  <td>
                    <label className="row">
                      <input type="checkbox" checked={editForm.isPrimary} onChange={(e) => setEditForm((x) => ({ ...x, isPrimary: e.target.checked }))} />
                      Primary
                    </label>
                  </td>
                  <td>
                    <div className="row">
                      <button
                        className="btn primary"
                        onClick={async () => {
                          try {
                            const original = data?.items.find((item) => item.assignmentId === editId);
                            if (!original) return;
                            await apiFetch(`/api/partner-assignments/${editId}`, {
                              method: "PUT",
                              token: auth.token ?? undefined,
                              body: JSON.stringify({
                                ...original,
                                safehouseId: editForm.safehouseId.trim() ? Number(editForm.safehouseId) : null,
                                programArea: editForm.programArea.trim(),
                                status: editForm.status,
                                isPrimary: editForm.isPrimary,
                              }),
                            });
                            setEditId(null);
                            await load();
                          } catch (e) {
                            setError((e as Error).message);
                          }
                        }}
                      >
                        Save
                      </button>
                      <button className="btn" onClick={() => setEditId(null)}>
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <PaginationControls page={page} totalPages={totalPages} onPrev={() => setPage((x) => Math.max(1, x - 1))} onNext={() => setPage((x) => Math.min(totalPages, x + 1))} />
        <datalist id="assignment-program-areas">
          {PROGRAM_AREAS.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      </div>
    </RequireRole>
  );
}
