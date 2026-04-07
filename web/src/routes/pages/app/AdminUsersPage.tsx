import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { RequireRole } from "../../guards";

type AdminUser = {
  id: string;
  email: string;
  userName: string;
  displayName: string | null;
  supporterId: number | null;
  lockoutEnd: string | null;
  roles: string[];
};

export function AdminUsersPage() {
  const auth = useAuth();

  const [q, setQ] = useState("");
  const [items, setItems] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [createEmail, setCreateEmail] = useState("");
  const [createDisplayName, setCreateDisplayName] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<"Admin" | "Employee" | "Donor">("Employee");
  const [createSupporterId, setCreateSupporterId] = useState<string>("");

  const canAdmin = useMemo(() => auth.hasRole("Admin"), [auth]);

  const load = async () => {
    setError(null);
    const res = await apiFetch<{ items: AdminUser[] }>(`/api/admin/users?q=${encodeURIComponent(q)}&take=100`, {
      token: auth.token ?? undefined,
    });
    setItems(res.items);
  };

  useEffect(() => {
    void load().catch((e) => setError((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.token]);

  return (
    <RequireRole role="Admin">
      <div style={{ display: "grid", gap: 12 }}>
        <div className="card">
          <h1 style={{ marginTop: 0 }}>User Administration</h1>
          <p className="muted">
            Create staff accounts, disable access, reset passwords, and link donor accounts to supporter records. Link donor cannot be used on Admin accounts (use a Donor login for grading).
          </p>
          {error ? (
            <div className="badge danger" style={{ marginTop: 10 }}>
              {error}
            </div>
          ) : null}

          <div className="row" style={{ marginTop: 10, alignItems: "end" }}>
            <label style={{ display: "grid", gap: 6, flex: 1, minWidth: 260 }}>
              <span className="muted">Search</span>
              <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Email, username, name…" />
            </label>
            <button className="btn" onClick={() => void load()} disabled={busy}>
              Search
            </button>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <div className="card tone-aqua" style={{ boxShadow: "none", flex: "1 1 260px" }}>
              <div style={{ fontWeight: 800 }}>Simple admin flow</div>
              <ol className="trust-list muted">
                <li>Create user with role and optional supporter link.</li>
                <li>Use Actions to reset password or enable and disable access.</li>
                <li>Use Link donor when donor account and supporter row must be connected.</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Create user</h2>
          <div className="row" style={{ alignItems: "end" }}>
            <label style={{ display: "grid", gap: 6, flex: 1, minWidth: 260 }}>
              <span className="muted">Email (username)</span>
              <input className="input" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} />
            </label>
            <label style={{ display: "grid", gap: 6, flex: 1, minWidth: 220 }}>
              <span className="muted">Display name</span>
              <input className="input" value={createDisplayName} onChange={(e) => setCreateDisplayName(e.target.value)} />
            </label>
            <label style={{ display: "grid", gap: 6, minWidth: 180 }}>
              <span className="muted">Role</span>
              <select className="input" value={createRole} onChange={(e) => setCreateRole(e.target.value as any)}>
                <option value="Employee">Employee</option>
                <option value="Admin">Admin</option>
                <option value="Donor">Donor</option>
              </select>
            </label>
          </div>
          <div className="row" style={{ marginTop: 10, alignItems: "end" }}>
            <label style={{ display: "grid", gap: 6, flex: 1, minWidth: 260 }}>
              <span className="muted">Password</span>
              <input className="input" type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} />
            </label>
            <label style={{ display: "grid", gap: 6, minWidth: 220 }}>
              <span className="muted">SupporterId (optional)</span>
              <input
                className="input"
                value={createSupporterId}
                onChange={(e) => setCreateSupporterId(e.target.value)}
                placeholder="e.g., 123"
              />
            </label>
            <button
              className="btn primary"
              disabled={!canAdmin || busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  const supporterId = createSupporterId.trim() ? Number(createSupporterId.trim()) : undefined;
                  await apiFetch("/api/admin/users/create", {
                    method: "POST",
                    token: auth.token ?? undefined,
                    body: JSON.stringify({
                      email: createEmail.trim(),
                      displayName: createDisplayName.trim() || null,
                      password: createPassword,
                      role: createRole,
                      supporterId: Number.isFinite(supporterId) ? supporterId : null,
                    }),
                  });
                  setCreateEmail("");
                  setCreateDisplayName("");
                  setCreatePassword("");
                  setCreateSupporterId("");
                  await load();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Create user
            </button>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Users</h2>
          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Roles</th>
                  <th>Status</th>
                  <th>SupporterId</th>
                  <th style={{ width: 340 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => {
                  const disabled = !!u.lockoutEnd;
                  return (
                    <tr key={u.id}>
                      <td data-label="Email" style={{ fontWeight: 800 }}>
                        {u.email}
                      </td>
                      <td data-label="Name" className="muted">
                        {u.displayName ?? "—"}
                      </td>
                      <td data-label="Roles">
                        <div className="row" style={{ gap: 8 }}>
                          {u.roles.map((r) => (
                            <span key={r} className="badge">
                              {r}
                            </span>
                          ))}
                          {u.roles.length === 0 ? <span className="muted">—</span> : null}
                        </div>
                      </td>
                      <td data-label="Status">{disabled ? <span className="badge warn">Disabled</span> : <span className="badge ok">Active</span>}</td>
                      <td data-label="SupporterId" className="muted">
                        {u.supporterId ?? "—"}
                      </td>
                      <td data-label="Actions">
                        <div className="row">
                          <button
                            className="btn"
                            disabled={busy}
                            onClick={async () => {
                              const newPass = prompt("New password (will be hashed):");
                              if (!newPass) return;
                              setBusy(true);
                              setError(null);
                              try {
                                await apiFetch("/api/admin/users/reset-password", {
                                  method: "POST",
                                  token: auth.token ?? undefined,
                                  body: JSON.stringify({ email: u.email, newPassword: newPass }),
                                });
                                alert("Password reset.");
                              } catch (e) {
                                setError((e as Error).message);
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            Reset password
                          </button>
                          <button
                            className="btn"
                            disabled={busy}
                            onClick={async () => {
                              setBusy(true);
                              setError(null);
                              try {
                                await apiFetch("/api/admin/users/set-enabled", {
                                  method: "POST",
                                  token: auth.token ?? undefined,
                                  body: JSON.stringify({ email: u.email, enabled: disabled }),
                                });
                                await load();
                              } catch (e) {
                                setError((e as Error).message);
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            {disabled ? "Enable" : "Disable"}
                          </button>
                          <button
                            className="btn"
                            disabled={busy}
                            onClick={async () => {
                              const sid = prompt("Link to SupporterId (number):", u.supporterId?.toString() ?? "");
                              if (!sid) return;
                              const supporterId = Number(sid);
                              if (!Number.isFinite(supporterId)) {
                                setError("SupporterId must be a number.");
                                return;
                              }
                              setBusy(true);
                              setError(null);
                              try {
                                await apiFetch("/api/admin/users/link-donor", {
                                  method: "POST",
                                  token: auth.token ?? undefined,
                                  body: JSON.stringify({ email: u.email, supporterId }),
                                });
                                await load();
                              } catch (e) {
                                setError((e as Error).message);
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            Link donor
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted">
                      No users found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RequireRole>
  );
}

