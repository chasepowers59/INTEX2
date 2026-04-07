import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
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
};

export function AdminPartnersPage() {
  const auth = useAuth();
  const [q, setQ] = useState("");
  const [data, setData] = useState<Paged<Partner> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [createForm, setCreateForm] = useState({
    partnerName: "",
    partnerType: "Organization",
    roleType: "SafehouseOps",
    region: "",
    status: "Active",
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    partnerName: "",
    partnerType: "Organization",
    roleType: "SafehouseOps",
    region: "",
    status: "Active",
  });
  const PAGE_SIZE = 10;

  const load = async () => {
    const res = await apiFetch<Paged<Partner>>(`/api/partners?q=${encodeURIComponent(q)}`, { token: auth.token ?? undefined });
    setData(res);
  };

  useEffect(() => {
    void load();
  }, []);

  const rows = (data?.items ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil((data?.items.length ?? 0) / PAGE_SIZE));

  return (
    <div className="card">
      <h1 style={{ marginTop: 0 }}>Partners</h1>
      <p className="muted">Manage partner organizations and contacts supporting safehouse programs.</p>
      {error ? <div className="badge danger">{error}</div> : null}
      <div className="row">
        <input className="input" placeholder="Search partner or region" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn" onClick={() => void load()}>Search</button>
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <input className="input" placeholder="Partner name" value={createForm.partnerName} onChange={(e) => setCreateForm((p) => ({ ...p, partnerName: e.target.value }))} />
        <input className="input" placeholder="Partner type" value={createForm.partnerType} onChange={(e) => setCreateForm((p) => ({ ...p, partnerType: e.target.value }))} />
        <input className="input" placeholder="Role type" value={createForm.roleType} onChange={(e) => setCreateForm((p) => ({ ...p, roleType: e.target.value }))} />
        <input className="input" placeholder="Region" value={createForm.region} onChange={(e) => setCreateForm((p) => ({ ...p, region: e.target.value }))} />
        <select className="input" value={createForm.status} onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value }))}>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        <button className="btn primary" onClick={async () => {
          if (!createForm.partnerName.trim()) return setError("Partner name is required.");
          try {
            await apiFetch("/api/partners", {
              method: "POST",
              token: auth.token ?? undefined,
              body: JSON.stringify({
                partnerName: createForm.partnerName.trim(),
                partnerType: createForm.partnerType.trim() || "Organization",
                roleType: createForm.roleType.trim() || "SafehouseOps",
                region: createForm.region.trim() || null,
                status: createForm.status,
              }),
            });
            setCreateForm({ partnerName: "", partnerType: "Organization", roleType: "SafehouseOps", region: "", status: "Active" });
            await load();
          } catch (e) {
            setError((e as Error).message);
          }
        }}>Add partner</button>
      </div>
      <div className="table-wrap" style={{ marginTop: 10 }}>
        <table className="table">
          <thead><tr><th>Name</th><th>Type</th><th>Role</th><th>Region</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.partnerId}>
                <td>{p.partnerName}</td>
                <td className="muted">{p.partnerType}</td>
                <td className="muted">{p.roleType}</td>
                <td className="muted">{p.region ?? "—"}</td>
                <td><span className="badge">{p.status}</span></td>
                <td>
                  <div className="row">
                    <button className="btn" onClick={() => {
                      setEditId(p.partnerId);
                      setEditForm({
                        partnerName: p.partnerName,
                        partnerType: p.partnerType,
                        roleType: p.roleType,
                        region: p.region ?? "",
                        status: p.status,
                      });
                    }}>Edit</button>
                    <button className="btn danger" onClick={async () => {
                      if (!confirm("Delete partner?")) return;
                      try {
                        await apiFetch(`/api/partners/${p.partnerId}?confirm=true`, { method: "DELETE", token: auth.token ?? undefined });
                        await load();
                      } catch (e) { setError((e as Error).message); }
                    }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {editId !== null ? (
              <tr>
                <td><input className="input" value={editForm.partnerName} onChange={(e) => setEditForm((x) => ({ ...x, partnerName: e.target.value }))} /></td>
                <td><input className="input" value={editForm.partnerType} onChange={(e) => setEditForm((x) => ({ ...x, partnerType: e.target.value }))} /></td>
                <td><input className="input" value={editForm.roleType} onChange={(e) => setEditForm((x) => ({ ...x, roleType: e.target.value }))} /></td>
                <td><input className="input" value={editForm.region} onChange={(e) => setEditForm((x) => ({ ...x, region: e.target.value }))} /></td>
                <td>
                  <select className="input" value={editForm.status} onChange={(e) => setEditForm((x) => ({ ...x, status: e.target.value }))}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </td>
                <td>
                  <div className="row">
                    <button className="btn primary" onClick={async () => {
                      try {
                        const original = data?.items.find((x) => x.partnerId === editId);
                        if (!original) return;
                        await apiFetch(`/api/partners/${editId}`, {
                          method: "PUT",
                          token: auth.token ?? undefined,
                          body: JSON.stringify({
                            ...original,
                            partnerName: editForm.partnerName.trim(),
                            partnerType: editForm.partnerType.trim(),
                            roleType: editForm.roleType.trim(),
                            region: editForm.region.trim() || null,
                            status: editForm.status,
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
