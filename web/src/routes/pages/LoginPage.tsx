import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";

export function LoginPage() {
  const auth = useAuth();
  const nav = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Sign in</h1>
      <p className="muted">
        This portal is for authorized staff and administrators only.
      </p>

      <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
        <span className="muted">Username</span>
        <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
      </label>

      <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
        <span className="muted">Password</span>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </label>

      {error ? (
        <div className="badge" style={{ marginTop: 12, borderColor: "var(--danger)" }}>
          {error}
        </div>
      ) : null}

      <div className="row" style={{ marginTop: 14, justifyContent: "space-between" }}>
        <button
          className="btn primary"
          disabled={loading}
          onClick={async () => {
            setError(null);
            setLoading(true);
            try {
              const roles = await auth.login(username.trim(), password);
              const isStaff = roles.includes("Admin") || roles.includes("Employee");
              const donorOnly = roles.includes("Donor") && !isStaff;
              nav(donorOnly ? "/app/donor" : "/app/dashboard");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <div className="muted" style={{ fontSize: 12, alignSelf: "center" }}>
          Need access? Ask an admin.
        </div>
      </div>
    </div>
  );
}

