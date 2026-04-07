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
        <button className="btn primary" onClick={async () => {
          const partnerId = Number(prompt("Partner ID?"));
          const program = prompt("Program area?", "CaseManagement");
          if (!Number.isFinite(partnerId) || !program) return;
          try {
            await apiFetch("/api/partner-assignments", {
              method: "POST",
              token: auth.token ?? undefined,
              body: JSON.stringify({ partnerId, safehouseId: null, programArea: program, status: "Active", isPrimary: false }),
            });
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
                    <button className="btn" onClick={async () => {
                      try {
                        await apiFetch(`/api/partner-assignments/${a.assignmentId}`, {
                          method: "PUT",
                          token: auth.token ?? undefined,
                          body: JSON.stringify({ ...a, isPrimary: !a.isPrimary }),
                        });
                        await load();
                      } catch (e) { setError((e as Error).message); }
                    }}>Toggle primary</button>
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
          </tbody>
        </table>
      </div>
      <PaginationControls page={page} totalPages={totalPages} onPrev={() => setPage((x) => Math.max(1, x - 1))} onNext={() => setPage((x) => Math.min(totalPages, x + 1))} />
    </div>
  );
}
