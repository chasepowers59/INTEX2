import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { RequireRole } from "../../guards";
import { PaginationControls } from "../../../components/ui/PaginationControls";

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
  const PAGE_SIZE = 10;

  const [q, setQ] = useState("");
  const [items, setItems] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [createEmail, setCreateEmail] = useState("");
  const [createDisplayName, setCreateDisplayName] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<"Admin" | "Employee" | "Donor">("Employee");
  const [createSupporterId, setCreateSupporterId] = useState<string>("");
  const [resetTargetEmail, setResetTargetEmail] = useState<string>("");
  const [resetPasswordValue, setResetPasswordValue] = useState<string>("");
  const [linkTargetEmail, setLinkTargetEmail] = useState<string>("");
  const [linkSupporterIdValue, setLinkSupporterIdValue] = useState<string>("");

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
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const rows = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <RequireRole role="Admin">
      <div className="admin-page">
        <div className="card">
          <div className="admin-header">
            <div className="admin-header-copy">
              <h1 style={{ marginTop: 0 }}>User Administration</h1>
              <p className="muted">Accounts, access, password resets, and donor links.</p>
            </div>
            <button className="btn primary" onClick={() => setShowCreate((open) => !open)}>
              {showCreate ? "Close" : "Create user"}
            </button>
          </div>
          {error ? <div className="badge danger" style={{ marginTop: 10 }}>{error}</div> : null}
          {notice ? <div className="badge ok" style={{ marginTop: 10 }}>{notice}</div> : null}

          <div className="admin-inline-grid" style={{ marginTop: 10 }}>
            <label className="admin-form-label span-8">
              <span className="muted">Search</span>
              <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Email, username, or name" />
            </label>
            <button className="btn" onClick={() => void load()} disabled={busy}>
              Search
            </button>
          </div>

          <div className={`process-collapsible ${showCreate ? "open" : ""}`} aria-hidden={!showCreate}>
            <div className="card process-form-card">
              <div className="process-header process-inline-header">
                <div>
                  <strong>User details</strong>
                </div>
              </div>
              <div className="admin-inline-grid">
                <label className="admin-form-label span-4">
                  <span className="muted">Email</span>
                  <input className="input" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} />
                </label>
                <label className="admin-form-label span-3">
                  <span className="muted">Display name</span>
                  <input className="input" value={createDisplayName} onChange={(e) => setCreateDisplayName(e.target.value)} />
                </label>
                <label className="admin-form-label span-2">
                  <span className="muted">Role</span>
                  <select className="input" value={createRole} onChange={(e) => setCreateRole(e.target.value as "Admin" | "Employee" | "Donor")}>
                    <option value="Employee">Employee</option>
                    <option value="Admin">Admin</option>
                    <option value="Donor">Donor</option>
                  </select>
                </label>
                <label className="admin-form-label span-3">
                  <span className="muted">Supporter ID</span>
                  <input className="input" value={createSupporterId} onChange={(e) => setCreateSupporterId(e.target.value)} placeholder="Optional" />
                </label>
                <label className="admin-form-label span-6">
                  <span className="muted">Password</span>
                  <input className="input" type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} />
                </label>
              </div>
              <div className="row process-form-actions" style={{ marginTop: 12, justifyContent: "space-between" }}>
                <span className="muted admin-note">Minimum 12 characters with uppercase, lowercase, number, and symbol.</span>
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
                      setShowCreate(false);
                      await load();
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Save user
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="admin-table-head">
            <div className="admin-header-copy">
              <h2 style={{ marginTop: 0 }}>Users</h2>
              <p className="muted">Select a user below to reset a password or link a donor account.</p>
            </div>
            <div className="admin-pill-row admin-compact-actions">
              <button
                className="btn"
                disabled={selectedEmails.length === 0 || busy}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    for (const email of selectedEmails) {
                      await apiFetch("/api/admin/users/set-enabled", {
                        method: "POST",
                        token: auth.token ?? undefined,
                        body: JSON.stringify({ email, enabled: true }),
                      });
                    }
                    setSelectedEmails([]);
                    await load();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Bulk enable ({selectedEmails.length})
              </button>
              <button
                className="btn danger"
                disabled={selectedEmails.length === 0 || busy}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    for (const email of selectedEmails) {
                      await apiFetch("/api/admin/users/set-enabled", {
                        method: "POST",
                        token: auth.token ?? undefined,
                        body: JSON.stringify({ email, enabled: false }),
                      });
                    }
                    setSelectedEmails([]);
                    await load();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Bulk disable ({selectedEmails.length})
              </button>
            </div>
          </div>

          <div className="admin-inline-grid" style={{ marginBottom: 12 }}>
            <label className="admin-form-label span-6">
              <span className="muted">Reset password</span>
              <input
                className="input"
                type="password"
                placeholder={resetTargetEmail ? `New password for ${resetTargetEmail}` : "Select a user below first"}
                value={resetPasswordValue}
                onChange={(e) => setResetPasswordValue(e.target.value)}
              />
            </label>
            <button
              className="btn"
              disabled={!resetTargetEmail || !resetPasswordValue || busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                setNotice(null);
                try {
                  await apiFetch("/api/admin/users/reset-password", {
                    method: "POST",
                    token: auth.token ?? undefined,
                    body: JSON.stringify({ email: resetTargetEmail, newPassword: resetPasswordValue }),
                  });
                  setNotice(`Password reset for ${resetTargetEmail}.`);
                  setResetPasswordValue("");
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Apply reset
            </button>
            <label className="admin-form-label span-4">
              <span className="muted">Link donor account</span>
              <input className="input" value={linkTargetEmail} readOnly placeholder="Select a user below first" />
            </label>
            <label className="admin-form-label span-2">
              <span className="muted">Supporter ID</span>
              <input className="input" value={linkSupporterIdValue} onChange={(e) => setLinkSupporterIdValue(e.target.value)} />
            </label>
            <button
              className="btn"
              disabled={!linkTargetEmail || !linkSupporterIdValue || busy}
              onClick={async () => {
                const supporterId = Number(linkSupporterIdValue);
                if (!Number.isFinite(supporterId)) {
                  setError("SupporterId must be a number.");
                  return;
                }
                setBusy(true);
                setError(null);
                setNotice(null);
                try {
                  await apiFetch("/api/admin/users/link-donor", {
                    method: "POST",
                    token: auth.token ?? undefined,
                    body: JSON.stringify({ email: linkTargetEmail, supporterId }),
                  });
                  setNotice(`Linked ${linkTargetEmail} to supporter ${supporterId}.`);
                  await load();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Apply link
            </button>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Roles</th>
                  <th>Status</th>
                  <th>SupporterId</th>
                  <th style={{ width: 340 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const disabled = !!u.lockoutEnd;
                  return (
                    <tr key={u.id}>
                      <td data-label="Select">
                        <input
                          type="checkbox"
                          checked={selectedEmails.includes(u.email)}
                          onChange={(e) =>
                            setSelectedEmails((prev) =>
                              e.target.checked ? [...prev, u.email] : prev.filter((x) => x !== u.email)
                            )
                          }
                        />
                      </td>
                      <td data-label="Email" style={{ fontWeight: 800 }}>{u.email}</td>
                      <td data-label="Name" className="muted">{u.displayName ?? "-"}</td>
                      <td data-label="Roles">
                        <div className="row" style={{ gap: 8 }}>
                          {u.roles.map((r) => (
                            <span key={r} className="badge">{r}</span>
                          ))}
                          {u.roles.length === 0 ? <span className="muted">-</span> : null}
                        </div>
                      </td>
                      <td data-label="Status">{disabled ? <span className="badge warn">Disabled</span> : <span className="badge ok">Active</span>}</td>
                      <td data-label="SupporterId" className="muted">{u.supporterId ?? "-"}</td>
                      <td data-label="Actions">
                        <div className="row admin-compact-actions">
                          <button
                            className="btn admin-table-action"
                            disabled={busy}
                            onClick={() => {
                              setResetTargetEmail(u.email);
                              setNotice(`Ready to reset password for ${u.email}.`);
                            }}
                          >
                            Choose for reset
                          </button>
                          <button
                            className="btn admin-table-action"
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
                            {disabled ? "Enable sign-in" : "Disable sign-in"}
                          </button>
                          <button
                            className="btn admin-table-action"
                            disabled={busy}
                            onClick={() => {
                              setLinkTargetEmail(u.email);
                              setLinkSupporterIdValue(u.supporterId?.toString() ?? "");
                              setNotice(`Ready to link donor for ${u.email}.`);
                            }}
                          >
                            Prepare donor link
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted">
                      No users found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        </div>
      </div>
    </RequireRole>
  );
}
