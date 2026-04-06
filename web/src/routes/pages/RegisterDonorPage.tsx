import React, { useState } from "react";
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

  return (
    <div className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Create donor account</h1>
      <p className="muted">
        Register with the same email already on file as a supporter (for example after our CSV import) to see your giving
        history in the donor portal. Otherwise we create a new supporter record for you—fully aligned with staff CRM data.
      </p>

      <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
        <span className="muted">Email</span>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </label>

      <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
        <span className="muted">Display name (or use first + last below)</span>
        <input
          className="input"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="name"
        />
      </label>

      <div className="row" style={{ marginTop: 10, gap: 10, flexWrap: "wrap" }}>
        <label style={{ display: "grid", gap: 6, flex: "1 1 140px" }}>
          <span className="muted">First name</span>
          <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
        </label>
        <label style={{ display: "grid", gap: 6, flex: "1 1 140px" }}>
          <span className="muted">Last name</span>
          <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
        </label>
      </div>

      <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
        <span className="muted">Phone (optional)</span>
        <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
      </label>

      <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
        <span className="muted">Organization (optional)</span>
        <input
          className="input"
          value={organizationName}
          onChange={(e) => setOrganizationName(e.target.value)}
          autoComplete="organization"
        />
      </label>

      <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
        <span className="muted">Password</span>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
      </label>

      <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
        <span className="muted">Confirm password</span>
        <input
          className="input"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
      </label>

      {error ? (
        <div className="badge danger" style={{ marginTop: 12 }}>
          {error}
        </div>
      ) : null}

      <div className="row" style={{ marginTop: 14, justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <button
          className="btn primary"
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
              const dest = from && from.startsWith("/") ? from : "/app/donor";
              nav(dest, { replace: true });
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? "Creating account…" : "Register & sign in"}
        </button>
        <Link className="btn" to="/login" state={from ? { from } : undefined}>
          Already have an account?
        </Link>
      </div>
    </div>
  );
}
