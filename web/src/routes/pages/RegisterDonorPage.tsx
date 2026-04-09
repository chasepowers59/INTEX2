import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";

function validatePassword(password: string): string | null {
  if (password.length < 14) return "Password must be at least 14 characters.";
  return null;
}

export function RegisterDonorPage() {
  const auth = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
    const dest = from && from.startsWith("/") ? from : staff ? "/app/dashboard" : "/app/donor";
    nav(dest, { replace: true });
  }, [auth, from, nav]);

  async function handleRegister() {
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
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
      nav(from && from.startsWith("/") ? from : "/app/donor", { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-page">
      <section className="card register-intro-card">
        <span className="eyebrow">Donor account</span>
        <h1>Create your Steps of Hope account.</h1>
        <p className="muted">
          Save your giving history, return to future gifts faster, and stay connected to public updates about the work
          your support makes possible.
        </p>

        <div className="register-photo">
          <img src="/photos/community-support.jpg" alt="Community members supporting survivor care." />
          <div>
            <strong>Support with confidence</strong>
            <span>Your account keeps your giving activity separate from private survivor care information.</span>
          </div>
        </div>

        <div className="register-benefit-grid">
          <div>
            <strong>Private by design</strong>
            <span>Public updates are written to protect survivor privacy.</span>
          </div>
          <div>
            <strong>Impact in one place</strong>
            <span>Return to view your giving and broad program updates.</span>
          </div>
          <div>
            <strong>Simple sign-in</strong>
            <span>Use this same email whenever you give again.</span>
          </div>
        </div>
      </section>

      <section className="card register-form-card">
        <div className="register-form-heading">
          <span className="eyebrow">Start here</span>
          <h2>Create your account</h2>
          <p className="muted">This short form creates a donor account for future gifts and impact updates.</p>
        </div>

        <label className="field-stack">
          <span className="field-label">Email</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>

        <label className="field-stack">
          <span className="field-label">How we should greet you</span>
          <input
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            placeholder="e.g. Jordan Lee or Hope Church"
          />
        </label>

        <div className="register-two-column">
          <label className="field-stack">
            <span className="field-label">Password</span>
            <span className="password-input-wrap">
              <input
                className="input password-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="At least 14 characters"
              />
              <button
                className="password-toggle"
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 4 20 21" />
                    <path d="M10.6 10.7a3 3 0 0 0 4 4" />
                    <path d="M9.9 5.3A10.7 10.7 0 0 1 12 5c5 0 8.9 3.1 10 7-0.4 1.5-1.3 2.9-2.6 4.1" />
                    <path d="M6.2 6.3C4.1 7.6 2.6 9.6 2 12c1.1 3.9 5 7 10 7 1.5 0 2.9-0.3 4.1-0.8" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2 12c1.1-3.9 5-7 10-7s8.9 3.1 10 7c-1.1 3.9-5 7-10 7S3.1 15.9 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </span>
          </label>
          <label className="field-stack">
            <span className="field-label">Confirm password</span>
            <span className="password-input-wrap">
              <input
                className="input password-input"
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                placeholder="Re-enter password"
              />
              <button
                className="password-toggle"
                type="button"
                aria-label={showConfirm ? "Hide confirmed password" : "Show confirmed password"}
                aria-pressed={showConfirm}
                onClick={() => setShowConfirm((value) => !value)}
              >
                {showConfirm ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 4 20 21" />
                    <path d="M10.6 10.7a3 3 0 0 0 4 4" />
                    <path d="M9.9 5.3A10.7 10.7 0 0 1 12 5c5 0 8.9 3.1 10 7-0.4 1.5-1.3 2.9-2.6 4.1" />
                    <path d="M6.2 6.3C4.1 7.6 2.6 9.6 2 12c1.1 3.9 5 7 10 7 1.5 0 2.9-0.3 4.1-0.8" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2 12c1.1-3.9 5-7 10-7s8.9 3.1 10 7c-1.1 3.9-5 7-10 7S3.1 15.9 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </span>
          </label>
        </div>

        <p className="password-hint">
          Passwords must be at least <strong>14 characters</strong>.
        </p>

        <details className="optional-block register-optional-block">
          <summary>Optional contact details</summary>
          <div className="register-two-column">
            <label className="field-stack">
              <span className="field-label">First name</span>
              <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
            </label>
            <label className="field-stack">
              <span className="field-label">Last name</span>
              <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
            </label>
          </div>
          <label className="field-stack">
            <span className="field-label">Phone</span>
            <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          </label>
          <label className="field-stack">
            <span className="field-label">Organization</span>
            <input
              className="input"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              autoComplete="organization"
            />
          </label>
        </details>

        {error ? <div className="badge danger">{error}</div> : null}

        <div className="register-actions">
          <button className="btn primary" disabled={loading} onClick={handleRegister}>
            {loading ? "Creating your account..." : "Create donor account"}
          </button>
          <span className="muted">
            Already have an account?{" "}
            <Link className="auth-link-subtle" to="/login" state={from ? { from } : undefined}>
              Sign in
            </Link>
          </span>
        </div>
      </section>
    </div>
  );
}
