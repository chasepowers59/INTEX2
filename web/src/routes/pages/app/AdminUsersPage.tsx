import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const selectedPanelRef = useRef<HTMLDivElement | null>(null);
  const clearSelectionTimerRef = useRef<number | null>(null);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedUserClosing, setSelectedUserClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);

  const [createEmail, setCreateEmail] = useState("");
  const [createDisplayName, setCreateDisplayName] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<"Admin" | "Employee" | "Donor">("Employee");
  const [createSupporterId, setCreateSupporterId] = useState("");
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [linkSupporterIdValue, setLinkSupporterIdValue] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editRole, setEditRole] = useState<"Admin" | "Employee" | "Donor">("Employee");
  const [editSupporterId, setEditSupporterId] = useState("");

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

  useEffect(() => {
    if (!selectedUser) return;
    selectedPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedUser]);

  useEffect(() => {
    return () => {
      if (clearSelectionTimerRef.current) {
        window.clearTimeout(clearSelectionTimerRef.current);
      }
    };
  }, []);

  const handleSelectUser = (user: AdminUser) => {
    if (clearSelectionTimerRef.current) {
      window.clearTimeout(clearSelectionTimerRef.current);
      clearSelectionTimerRef.current = null;
    }
    setSelectedUserClosing(false);
    setSelectedUser(user);
    setResetPasswordValue("");
    setLinkSupporterIdValue(user.supporterId?.toString() ?? "");
    setEditEmail(user.email);
    setEditDisplayName(user.displayName ?? "");
    setEditRole((user.roles[0] as "Admin" | "Employee" | "Donor") ?? "Employee");
    setEditSupporterId(user.supporterId?.toString() ?? "");
    setNotice(`Selected ${user.email}.`);
  };

  const handleClearSelection = () => {
    if (!selectedUser) return;
    setSelectedUserClosing(true);
    setResetPasswordValue("");
    setLinkSupporterIdValue("");
    setEditEmail("");
    setEditDisplayName("");
    setEditSupporterId("");
    if (clearSelectionTimerRef.current) {
      window.clearTimeout(clearSelectionTimerRef.current);
    }
    clearSelectionTimerRef.current = window.setTimeout(() => {
      setSelectedUser(null);
      setSelectedUserClosing(false);
      clearSelectionTimerRef.current = null;
    }, 220);
  };

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const rows = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedDisabled = !!selectedUser?.lockoutEnd;

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
                <strong>User details</strong>
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
                <span className="muted admin-note">Minimum 14 characters.</span>
                <button
                  className="btn primary"
                  disabled={!canAdmin || busy}
                  onClick={async () => {
                    setBusy(true);
                    setError(null);
                    setNotice(null);
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
                      setNotice("User created.");
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

        <div
          ref={selectedPanelRef}
          className={`process-collapsible user-selected-wrap ${selectedUser ? "open" : ""} ${selectedUserClosing ? "closing" : ""}`}
          aria-hidden={!selectedUser}
        >
          {selectedUser ? (
            <div
              key={selectedUser.id}
              className={`card process-form-card user-selected-panel ${selectedUserClosing ? "closing" : ""}`}
            >
              <div className="admin-header">
                <div className="admin-header-copy">
                  <h2 style={{ marginTop: 0 }}>Edit user</h2>
                  <p className="muted">Update account details, access, and donor link for {selectedUser.email}.</p>
                </div>
                <button
                  className="btn"
                  onClick={handleClearSelection}
                >
                  Clear selection
                </button>
              </div>

              <div className="admin-kpi-grid" style={{ marginTop: 8 }}>
                <div className="card admin-kpi tone-cream">
                  <div className="muted">Display name</div>
                  <div className="admin-kpi-value" style={{ fontSize: 22 }}>{selectedUser.displayName ?? "-"}</div>
                </div>
                <div className="card admin-kpi tone-cream">
                  <div className="muted">Status</div>
                  <div className="admin-kpi-value" style={{ fontSize: 22 }}>{selectedDisabled ? "Disabled" : "Active"}</div>
                </div>
                <div className="card admin-kpi tone-cream">
                  <div className="muted">Roles</div>
                  <div className="admin-kpi-value" style={{ fontSize: 18 }}>
                    {selectedUser.roles.length ? selectedUser.roles.join(", ") : "-"}
                  </div>
                </div>
                <div className="card admin-kpi tone-cream">
                  <div className="muted">Supporter link</div>
                  <div className="admin-kpi-value" style={{ fontSize: 22 }}>{selectedUser.supporterId ?? "-"}</div>
                </div>
              </div>

              <div className="card" style={{ boxShadow: "none", marginTop: 12 }}>
                <div className="admin-header-copy">
                  <h3 style={{ marginTop: 0 }}>User details</h3>
                  <p className="muted">Edit the user’s email, display name, role, and donor link.</p>
                </div>
                <div className="admin-inline-grid" style={{ marginTop: 10 }}>
                  <label className="admin-form-label span-4">
                    <span className="muted">Email</span>
                    <input className="input" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                  </label>
                  <label className="admin-form-label span-3">
                    <span className="muted">Display name</span>
                    <input className="input" value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} />
                  </label>
                  <label className="admin-form-label span-2">
                    <span className="muted">Role</span>
                    <select className="input" value={editRole} onChange={(e) => setEditRole(e.target.value as "Admin" | "Employee" | "Donor")}>
                      <option value="Employee">Employee</option>
                      <option value="Admin">Admin</option>
                      <option value="Donor">Donor</option>
                    </select>
                  </label>
                  <label className="admin-form-label span-3">
                    <span className="muted">Supporter ID</span>
                    <input
                      className="input"
                      value={editSupporterId}
                      onChange={(e) => setEditSupporterId(e.target.value)}
                      placeholder={editRole === "Admin" ? "Not used for admins" : "Optional"}
                      disabled={editRole === "Admin"}
                    />
                  </label>
                </div>
                <div className="row process-form-actions" style={{ marginTop: 12, justifyContent: "flex-end" }}>
                  <button
                    className="btn primary"
                    disabled={busy}
                    onClick={async () => {
                      if (!selectedUser) return;
                      const supporterId = editSupporterId.trim() ? Number(editSupporterId.trim()) : null;
                      if (editSupporterId.trim() && !Number.isFinite(supporterId)) {
                        setError("Supporter ID must be a number.");
                        return;
                      }
                      setBusy(true);
                      setError(null);
                      setNotice(null);
                      try {
                        const updated = await apiFetch<AdminUser>(`/api/admin/users/${selectedUser.id}`, {
                          method: "PUT",
                          token: auth.token ?? undefined,
                          body: JSON.stringify({
                            id: selectedUser.id,
                            email: editEmail.trim(),
                            displayName: editDisplayName.trim() || null,
                            role: editRole,
                            supporterId: editRole === "Admin" ? null : supporterId,
                          }),
                        });
                        setSelectedUser((prev) =>
                          prev
                            ? {
                                ...prev,
                                email: updated.email,
                                userName: updated.userName,
                                displayName: updated.displayName,
                                supporterId: updated.supporterId,
                                roles: updated.roles,
                              }
                            : prev,
                        );
                        setLinkSupporterIdValue(updated.supporterId?.toString() ?? "");
                        setEditEmail(updated.email);
                        setEditDisplayName(updated.displayName ?? "");
                        setEditRole((updated.roles[0] as "Admin" | "Employee" | "Donor") ?? "Employee");
                        setEditSupporterId(updated.supporterId?.toString() ?? "");
                        setNotice(`Updated ${updated.email}.`);
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

              <div className="admin-two-column" style={{ marginTop: 12 }}>
                <div className="card" style={{ boxShadow: "none" }}>
                  <div className="admin-header-copy">
                    <h3 style={{ marginTop: 0 }}>Reset password</h3>
                    <p className="muted">Set a new password for this account.</p>
                  </div>
                  <div className="admin-inline-grid" style={{ marginTop: 10 }}>
                    <label className="admin-form-label span-8">
                      <span className="muted">New password</span>
                      <input
                        className="input"
                        type="password"
                        value={resetPasswordValue}
                        onChange={(e) => setResetPasswordValue(e.target.value)}
                      />
                    </label>
                    <button
                      className="btn"
                      disabled={!resetPasswordValue || busy}
                      onClick={async () => {
                        if (!selectedUser) return;
                        setBusy(true);
                        setError(null);
                        setNotice(null);
                        try {
                          await apiFetch("/api/admin/users/reset-password", {
                            method: "POST",
                            token: auth.token ?? undefined,
                            body: JSON.stringify({ email: selectedUser.email, newPassword: resetPasswordValue }),
                          });
                          setNotice(`Password reset for ${selectedUser.email}.`);
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
                  </div>
                </div>

                <div className="card" style={{ boxShadow: "none" }}>
                  <div className="admin-header-copy">
                    <h3 style={{ marginTop: 0 }}>Account access</h3>
                    <p className="muted">Enable sign-in or link this user to a donor record.</p>
                  </div>
                  <div className="admin-inline-grid" style={{ marginTop: 10 }}>
                    <label className="admin-form-label span-6">
                      <span className="muted">Supporter ID</span>
                      <input
                        className="input"
                        value={linkSupporterIdValue}
                        onChange={(e) => setLinkSupporterIdValue(e.target.value)}
                        placeholder={selectedUser.supporterId?.toString() ?? "Optional"}
                      />
                    </label>
                    <button
                      className="btn"
                      disabled={!linkSupporterIdValue || busy}
                      onClick={async () => {
                        if (!selectedUser) return;
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
                            body: JSON.stringify({ email: selectedUser.email, supporterId }),
                          });
                          setNotice(`Linked ${selectedUser.email} to supporter ${supporterId}.`);
                          setSelectedUser((prev) => (prev ? { ...prev, supporterId } : prev));
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
                    <button
                      className={`btn ${selectedDisabled ? "primary" : "danger"}`}
                      disabled={busy}
                      onClick={async () => {
                        if (!selectedUser) return;
                        setBusy(true);
                        setError(null);
                        setNotice(null);
                        try {
                          await apiFetch("/api/admin/users/set-enabled", {
                            method: "POST",
                            token: auth.token ?? undefined,
                            body: JSON.stringify({ email: selectedUser.email, enabled: selectedDisabled }),
                          });
                          setNotice(`${selectedDisabled ? "Enabled" : "Disabled"} sign-in for ${selectedUser.email}.`);
                          const updated = {
                            ...selectedUser,
                            lockoutEnd: selectedDisabled ? null : new Date().toISOString(),
                          };
                          setSelectedUser(updated);
                          await load();
                        } catch (e) {
                          setError((e as Error).message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {selectedDisabled ? "Enable sign-in" : "Disable sign-in"}
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
              <h2 style={{ marginTop: 0 }}>Users</h2>
              <p className="muted">Open a user to edit their details, password, access, or donor link.</p>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Roles</th>
                  <th>Status</th>
                  <th>Supporter ID</th>
                  <th style={{ width: 180 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => {
                  const disabled = !!user.lockoutEnd;
                  const isSelected = selectedUser?.id === user.id;
                  return (
                    <tr key={user.id} className={isSelected ? "donor-row-selected" : undefined}>
                      <td data-label="Email" style={{ fontWeight: 800 }}>{user.email}</td>
                      <td data-label="Name" className="muted">{user.displayName ?? "-"}</td>
                      <td data-label="Roles">
                        <div className="row" style={{ gap: 8 }}>
                          {user.roles.map((role) => (
                            <span key={role} className="badge">{role}</span>
                          ))}
                          {user.roles.length === 0 ? <span className="muted">-</span> : null}
                        </div>
                      </td>
                      <td data-label="Status">
                        {disabled ? <span className="badge warn">Disabled</span> : <span className="badge ok">Active</span>}
                      </td>
                      <td data-label="Supporter ID" className="muted">{user.supporterId ?? "-"}</td>
                      <td data-label="Actions">
                        <button
                          className={`btn admin-table-action ${isSelected ? "donor-row-selected-action" : ""}`}
                          disabled={busy}
                          onClick={() => handleSelectUser(user)}
                        >
                          {isSelected ? "Editing" : "Edit"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted">No users found.</td>
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
