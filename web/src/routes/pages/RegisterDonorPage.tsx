import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";

export function RegisterDonorPage() {
  const auth = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    const staff = auth.hasRole("Admin") || auth.hasRole("Employee");
    nav(staff ? "/app/dashboard" : "/app/donor", { replace: true });
  }, [auth, nav]);

  return (
    <div className="auth-split">
      <div className="auth-aside auth-dark-shell">
        <div className="badge donor-role-badge" style={{ marginBottom: 12 }}>
          Free donor account · Donor role · South Korea victim support
        </div>
        <h2>Give and see your impact—in about a minute</h2>
        <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
          We assign the <strong>Donor</strong> role automatically so only <em>your</em> receipts and anonymized allocation
          summaries are visible. Your giving supports South Korean victims while resident identities stay inside the
          staff portal.
        </p>
        <ul className="muted" style={{ margin: "16px 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
          <li>Use the <strong>same email</strong> as your supporter record after CSV import to link history.</li>
          <li>Or start fresh—we’ll create a supporter profile for you.</li>
          <li>Password must be <strong>12+</strong> characters with upper, lower, number, and a symbol.</li>
        </ul>
        <div className="row" style={{ marginTop: 18 }}>
          <Link className="btn" to="/login" state={from ? { from } : undefined}>
            Staff sign-in
          </Link>
          <Link className="btn" to="/impact">
            Public impact
          </Link>
        </div>
        <div className="image-frame" style={{ marginTop: 12, maxHeight: 260 }}>
          <img src="/reference/auth-layout-ref.png" alt="Registration and auth style inspiration." />
        </div>
      </div>

      <div className="card auth-panel glow-donor auth-dark-panel">
        <div className="step-track">
          <span className="step-pill active">1 · Email</span>
          <span className="step-pill active">2 · Password</span>
          <span className="step-pill active">3 · Name</span>
        </div>
        <h1 style={{ marginTop: 0, fontSize: 26, letterSpacing: "-0.02em" }}>Create your donor account</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          One short form. You’ll be signed in immediately with the Donor role.
        </p>

        <div className="photo-placeholder" role="img" aria-label="Donors joining support efforts for South Korean victims" style={{ marginBottom: 14 }}>
          <img src="/reference/donor-impact-community.jpg" alt="Donors joining survivor support efforts." />
          <div className="caption">Donors joining South Korean victim support efforts</div>
        </div>

        <div className="field-stack" style={{ marginTop: 16 }}>
          <span className="field-label">Email</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>

        <div className="field-stack" style={{ marginTop: 14 }}>
          <span className="field-label">How we’ll greet you</span>
          <input
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            placeholder="e.g. Jordan Lee or Hope Church"
          />
          <span className="password-hint">Or add first &amp; last name in optional details below.</span>
        </div>

        <div className="field-stack" style={{ marginTop: 14 }}>
          <span className="field-label">Password</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="12+ characters, mixed case, number, symbol"
          />
        </div>

        <div className="field-stack" style={{ marginTop: 14 }}>
          <span className="field-label">Confirm password</span>
          <input
            className="input"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <details className="optional-block">
          <summary>Optional details</summary>
          <div className="row" style={{ marginTop: 10, gap: 10, flexWrap: "wrap" }}>
            <label className="field-stack" style={{ flex: "1 1 140px" }}>
              <span className="field-label">First name</span>
              <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
            </label>
            <label className="field-stack" style={{ flex: "1 1 140px" }}>
              <span className="field-label">Last name</span>
              <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
            </label>
          </div>
          <label className="field-stack" style={{ marginTop: 12 }}>
            <span className="field-label">Phone</span>
            <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          </label>
          <label className="field-stack" style={{ marginTop: 12 }}>
            <span className="field-label">Organization</span>
            <input
              className="input"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              autoComplete="organization"
            />
          </label>
        </details>

        {error ? (
          <div className="badge danger" style={{ marginTop: 14 }}>
            {error}
          </div>
        ) : null}

        <div className="row" style={{ marginTop: 18, justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <button
            className="btn auth-action-primary"
            disabled={loading}
            onClick={async () => {
              setError(null);
              if (password !== confirm) {
                setError("Passwords do not match.");
                return;
              }
              setLoading(true);
              try {
                await auth.registerDonor({
                  email: email.trim(),
                  password,
                  displayName: displayName.trim() || undefined,
                  firstName: firstName.trim() || undefined,
                  lastName: lastName.trim() || undefined,
                  phone: phone.trim() || undefined,
                  organizationName: organizationName.trim() || undefined,
                });
                nav("/app/donor", { replace: true });
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Creating your account…" : "Register & go to my portal"}
          </button>
          <Link className="btn" to="/login" state={from ? { from } : undefined}>
            Already have an account?
          </Link>
        </div>
      </div>
    </div>
  );
}
