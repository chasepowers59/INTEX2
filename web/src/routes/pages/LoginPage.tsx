import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";

export function LoginPage() {
  const auth = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    const staff = auth.hasRole("Admin") || auth.hasRole("Employee");
    nav(staff ? "/app/dashboard" : "/app/donor", { replace: true });
  }, [auth, nav]);

  return (
    <div style={{ maxWidth: 540, margin: "0 auto" }}>
      <div className="card auth-panel">
        <h1 style={{ marginTop: 0, fontSize: 26, letterSpacing: "-0.02em" }}>Sign in</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Enter your email and password to access your Steps of Hope account.
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
            onChange={(e) => {
              setPassword(e.target.value);
              if (!needsTwoFactor) return;
              setNeedsTwoFactor(false);
              setTwoFactorCode("");
            }}
            autoComplete="current-password"
          />
        </label>

        {needsTwoFactor ? (
          <label className="field-stack" style={{ marginTop: 14 }}>
            <span className="field-label">Authenticator code</span>
            <input
              className="input"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              autoComplete="one-time-code"
              inputMode="numeric"
              placeholder="123456"
            />
            <span className="muted" style={{ fontSize: 12 }}>
              Enter the current 6-digit code from your authenticator app.
            </span>
          </label>
        ) : null}

        <div className="auth-inline-row" style={{ marginTop: 10 }}>
          <label className="muted" style={{ fontSize: 12 }}>
            <input type="checkbox" style={{ marginRight: 6 }} /> Remember me
          </label>
        </div>

        {error ? (
          <div className="badge danger" style={{ marginTop: 14 }}>
            {error}
          </div>
        ) : null}

        <div
          className="row"
          style={{ marginTop: 20, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}
        >
          <button
            className="btn primary"
            disabled={loading}
            onClick={async () => {
              setError(null);
              setLoading(true);
              try {
                const roles = await auth.login(username.trim(), password, needsTwoFactor ? twoFactorCode : undefined);
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
                const err = e as Error & { requiresTwoFactor?: boolean };
                if (err.requiresTwoFactor) {
                  setNeedsTwoFactor(true);
                }
                setError(err.message);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Signing in..." : needsTwoFactor ? "Verify and sign in" : "Sign in"}
          </button>
          <span style={{ display: "grid", gap: 8, justifyItems: "end" }}>
            <span className="auth-link-subtle">Forgot password?</span>
            <span className="muted" style={{ fontSize: 12 }}>
              New donor?{" "}
              <Link className="auth-link-subtle" to="/register" state={from ? { from } : undefined}>
                Create an account
              </Link>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
