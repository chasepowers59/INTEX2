import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";

export function LoginPage() {
  const auth = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="auth-split">
      <div className="auth-aside">
        <h2>Welcome back</h2>
        <p className="muted" style={{ margin: 0, lineHeight: 1.65 }}>
          <strong>Staff</strong> use work email here for the leadership dashboard. <strong>Donors</strong> use the email
          from registration—the same one as your supporter record if we imported Lighthouse data.
        </p>
        <div className="badge" style={{ marginTop: 16, borderColor: "rgba(124,108,255,0.4)", background: "rgba(124,108,255,0.08)" }}>
          Role-based access: Admin · Employee · Donor
        </div>
        <div className="row" style={{ marginTop: 20 }}>
          <Link className="btn primary" to="/register">
            New? Create donor account
          </Link>
          <Link className="btn" to="/impact">
            Public impact
          </Link>
        </div>
      </div>

      <div className="card auth-panel">
        <h1 style={{ marginTop: 0, fontSize: 26, letterSpacing: "-0.02em" }}>Sign in</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Email and password for your Steps of Hope account.
        </p>

        <label className="field-stack" style={{ marginTop: 18 }}>
          <span className="field-label">Email</span>
          <input
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            type="email"
            placeholder="name@organization.org"
          />
        </label>

        <label className="field-stack" style={{ marginTop: 14 }}>
          <span className="field-label">Password</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error ? (
          <div className="badge danger" style={{ marginTop: 14 }}>
            {error}
          </div>
        ) : null}

        <div className="row" style={{ marginTop: 20, justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
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
                const dest =
                  from && from.startsWith("/")
                    ? from
                    : donorOnly
                      ? "/app/donor"
                      : "/app/dashboard";
                nav(dest, { replace: true });
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <Link className="btn" to="/register" state={from ? { from } : undefined}>
            Donor registration
          </Link>
        </div>
      </div>
    </div>
  );
}
