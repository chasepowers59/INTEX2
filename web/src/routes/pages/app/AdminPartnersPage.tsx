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
        <button
          className="btn primary"
          onClick={async () => {
            const name = prompt("Partner name?");
            if (!name) return;
            try {
              await apiFetch("/api/partners", {
                method: "POST",
                token: auth.token ?? undefined,
                body: JSON.stringify({ partnerName: name, partnerType: "Organization", roleType: "SafehouseOps", status: "Active" }),
              });
              await load();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Add partner
        </button>
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
                    <button className="btn" onClick={async () => {
                      const next = prompt("Partner name", p.partnerName);
                      if (!next) return;
                      try {
                        await apiFetch(`/api/partners/${p.partnerId}`, {
                          method: "PUT",
                          token: auth.token ?? undefined,
                          body: JSON.stringify({ ...p, partnerName: next }),
                        });
                        await load();
                      } catch (e) { setError((e as Error).message); }
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
          </tbody>
        </table>
      </div>
      <PaginationControls page={page} totalPages={totalPages} onPrev={() => setPage((x) => Math.max(1, x - 1))} onNext={() => setPage((x) => Math.min(totalPages, x + 1))} />
    </div>
  );
}
