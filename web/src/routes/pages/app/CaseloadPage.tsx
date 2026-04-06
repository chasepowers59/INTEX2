import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { RequireRole } from "../../guards";

type ResidentRow = {
  residentId: number;
  displayName: string;
  caseStatus: string;
  caseCategory: string | null;
  safehouseId: number;
  safehouseName: string;
  assignedSocialWorker: string | null;
};

type Paged<T> = { page: number; pageSize: number; total: number; items: T[] };

export function CaseloadPage() {
  const auth = useAuth();
  const [status, setStatus] = useState<string>("Active");
  const [q, setQ] = useState("");
  const [data, setData] = useState<Paged<ResidentRow> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    const res = await apiFetch<Paged<ResidentRow>>(`/api/residents?${params.toString()}`, { token: auth.token ?? undefined });
    setData(res);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Caseload Inventory</h1>
        <p className="muted">Filter and search residents by status, safehouse, category, and more.</p>

        {error ? <div className="badge" style={{ borderColor: "var(--danger)" }}>{error}</div> : null}

        <div className="row" style={{ marginTop: 8 }}>
          <label style={{ display: "grid", gap: 6, minWidth: 220 }}>
            <span className="muted">Case status</span>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Active">Active</option>
              <option value="Closed">Closed</option>
              <option value="OnHold">OnHold</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6, flex: 1, minWidth: 220 }}>
            <span className="muted">Search</span>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Resident name or social worker…" />
          </label>
          <button className="btn" style={{ alignSelf: "end" }} onClick={() => void load()}>
            Apply
          </button>
          <RequireRole role="Admin">
            <button
              className="btn primary"
              style={{ alignSelf: "end" }}
              onClick={async () => {
                const displayName = prompt("Resident display name (anonymized)?");
                if (!displayName) return;
                try {
                  await apiFetch<void>("/api/residents", {
                    method: "POST",
                    token: auth.token ?? undefined,
                    body: JSON.stringify({
                      displayName,
                      caseStatus: "Active",
                      caseCategory: null,
                      subCategory: null,
                      safehouseId: 1,
                      admissionDate: null,
                      assignedSocialWorker: null,
                      isReintegrated: false,
                    }),
                  });
                  await load();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Add resident
            </button>
          </RequireRole>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Resident</th>
                <th>Status</th>
                <th>Category</th>
                <th>Safehouse</th>
                <th>Social worker</th>
                <th style={{ width: 260 }}>Quick links</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((x) => (
                <tr key={x.residentId}>
                  <td data-label="Resident" style={{ fontWeight: 700 }}>
                    {x.displayName}
                  </td>
                  <td data-label="Status">
                    <span className="badge">{x.caseStatus}</span>
                  </td>
                  <td data-label="Category" className="muted">
                    {x.caseCategory ?? "—"}
                  </td>
                  <td data-label="Safehouse" className="muted">
                    {x.safehouseName}
                  </td>
                  <td data-label="Social worker" className="muted">
                    {x.assignedSocialWorker ?? "—"}
                  </td>
                  <td data-label="Quick links">
                    <div className="row">
                      <Link className="btn" to={`/app/residents/${x.residentId}/process-recordings`}>
                        Process recordings
                      </Link>
                      <Link className="btn" to={`/app/residents/${x.residentId}/home-visits`}>
                        Home visits
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {data && data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    No residents found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
