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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [externalLoading, setExternalLoading] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    const staff = auth.hasRole("Admin") || auth.hasRole("Employee");
    nav(staff ? "/app/dashboard" : "/app/donor", { replace: true });
  }, [auth, nav]);

  useEffect(() => {
    const params = new URLSearchParams(loc.search);
    const externalToken = params.get("externalToken");
    const externalError = params.get("externalError");
    if (externalError) {
      setError(externalError);
      return;
    }
    if (!externalToken) return;
    setExternalLoading(true);
    setError(null);
    void (async () => {
      try {
        const roles = await auth.acceptExternalToken(externalToken);
        const isStaff = roles.includes("Admin") || roles.includes("Employee");
        nav(isStaff ? "/app/dashboard" : "/app/donor", { replace: true });
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setExternalLoading(false);
      }
    })();
  }, [auth, loc.search, nav]);

  const githubLoginUrl = `${(import.meta.env.VITE_API_BASE_URL as string).replace(/\/+$/, "")}/api/auth/github/start?returnUrl=${encodeURIComponent(window.location.origin + "/login")}`;

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
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        <div className="auth-inline-row" style={{ marginTop: 10 }}>
          <label className="muted" style={{ fontSize: 12 }}>
            <input type="checkbox" style={{ marginRight: 6 }} /> Remember me
          </label>
        </div>

        <button
          className="btn"
          style={{ marginTop: 12, width: "100%" }}
          disabled={loading || externalLoading}
          onClick={() => {
            window.location.href = githubLoginUrl;
          }}
        >
          Continue with GitHub
        </button>

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
            {loading ? "Signing in..." : "Sign in"}
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
