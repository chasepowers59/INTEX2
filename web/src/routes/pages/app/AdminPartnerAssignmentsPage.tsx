import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
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
    const res = await apiFetch<Paged<Assignment>>(`/api/partner-assignments?programArea=${encodeURIComponent(programArea)}`, { token: auth.token ?? undefined });
    setData(res);
  };

  useEffect(() => {
    void apiFetch<Paged<Partner>>("/api/partners?pageSize=300", { token: auth.token ?? undefined }).then((x) => setPartners(x.items));
    void load();
  }, []);

  const rows = (data?.items ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil((data?.items.length ?? 0) / PAGE_SIZE));

  return (
    <div className="card">
      <h1 style={{ marginTop: 0 }}>Partner assignments</h1>
      <p className="muted">Assign partners by safehouse and program area for operational coverage.</p>
      {error ? <div className="badge danger">{error}</div> : null}
      <div className="row">
        <input className="input" value={programArea} onChange={(e) => setProgramArea(e.target.value)} placeholder="Filter by program area" />
        <button className="btn" onClick={() => void load()}>Filter</button>
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <select className="input" value={createForm.partnerId} onChange={(e) => setCreateForm((p) => ({ ...p, partnerId: e.target.value }))}>
          <option value="">Select partner</option>
          {partners.map((p) => (
            <option key={p.partnerId} value={p.partnerId}>{p.partnerId} - {p.partnerName}</option>
          ))}
        </select>
        <input className="input" placeholder="Safehouse ID (optional)" value={createForm.safehouseId} onChange={(e) => setCreateForm((p) => ({ ...p, safehouseId: e.target.value }))} />
        <input className="input" placeholder="Program area" value={createForm.programArea} onChange={(e) => setCreateForm((p) => ({ ...p, programArea: e.target.value }))} />
        <select className="input" value={createForm.status} onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value }))}>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <label className="row"><input type="checkbox" checked={createForm.isPrimary} onChange={(e) => setCreateForm((p) => ({ ...p, isPrimary: e.target.checked }))} /> Primary</label>
        <button className="btn primary" onClick={async () => {
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
          } catch (e) { setError((e as Error).message); }
        }}>Add assignment</button>
      </div>
      <div className="muted" style={{ marginTop: 8 }}>Partners: {partners.map((p) => `${p.partnerId}:${p.partnerName}`).slice(0, 6).join(" · ")}{partners.length > 6 ? " ..." : ""}</div>
      <div className="table-wrap" style={{ marginTop: 10 }}>
        <table className="table">
          <thead><tr><th>Partner</th><th>Safehouse</th><th>Program area</th><th>Status</th><th>Primary</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.assignmentId}>
                <td>{a.partnerName}</td>
                <td className="muted">{a.safehouseName ?? (a.safehouseId ?? "Unassigned")}</td>
                <td><span className="badge">{a.programArea}</span></td>
                <td>{a.status}</td>
                <td>{a.isPrimary ? "Yes" : "No"}</td>
                <td>
                  <div className="row">
                    <button className="btn" onClick={() => {
                      setEditId(a.assignmentId);
                      setEditForm({
                        safehouseId: a.safehouseId?.toString() ?? "",
                        programArea: a.programArea,
                        status: a.status,
                        isPrimary: a.isPrimary,
                      });
                    }}>Edit</button>
                    <button className="btn danger" onClick={async () => {
                      if (!confirm("Delete assignment?")) return;
                      try {
                        await apiFetch(`/api/partner-assignments/${a.assignmentId}?confirm=true`, { method: "DELETE", token: auth.token ?? undefined });
                        await load();
                      } catch (e) { setError((e as Error).message); }
                    }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {editId !== null ? (
              <tr>
                <td className="muted">Editing #{editId}</td>
                <td><input className="input" value={editForm.safehouseId} onChange={(e) => setEditForm((x) => ({ ...x, safehouseId: e.target.value }))} /></td>
                <td><input className="input" value={editForm.programArea} onChange={(e) => setEditForm((x) => ({ ...x, programArea: e.target.value }))} /></td>
                <td>
                  <select className="input" value={editForm.status} onChange={(e) => setEditForm((x) => ({ ...x, status: e.target.value }))}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </td>
                <td><label className="row"><input type="checkbox" checked={editForm.isPrimary} onChange={(e) => setEditForm((x) => ({ ...x, isPrimary: e.target.checked }))} /> Primary</label></td>
                <td>
                  <div className="row">
                    <button className="btn primary" onClick={async () => {
                      try {
                        const original = data?.items.find((x) => x.assignmentId === editId);
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
                      } catch (e) { setError((e as Error).message); }
                    }}>Save</button>
                    <button className="btn" onClick={() => setEditId(null)}>Cancel</button>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <PaginationControls page={page} totalPages={totalPages} onPrev={() => setPage((x) => Math.max(1, x - 1))} onNext={() => setPage((x) => Math.min(totalPages, x + 1))} />
    </div>
  );
}
