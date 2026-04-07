import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { apiFetch } from "../../lib/api";

type DonateResponse = { contributionId: number };

export function GivePage() {
  const auth = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const [amount, setAmount] = useState<string>("");
  const [campaignName, setCampaignName] = useState<string>("General Fund");
  const [notes, setNotes] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);

  useEffect(() => {
    setError(null);
    setSuccessId(null);
  }, [auth.isAuthenticated, auth.roles.join(",")]);

  const signInToDonate = () => {
    nav("/login", { state: { from: loc.pathname } });
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card glow-donor" style={{ padding: 26 }}>
        <div className="badge donor-role-badge" style={{ marginBottom: 12 }}>
          Secure giving · Donor role after sign-in
        </div>
        <h1 style={{ marginTop: 0, fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 800, letterSpacing: "-0.03em" }}>
          Give with confidence
        </h1>
        <p className="muted" style={{ fontSize: 16, lineHeight: 1.6, maxWidth: 760, margin: 0 }}>
          Your gift is recorded against your supporter profile. Create a <strong>donor account</strong> in one minute—we
          assign the <strong>Donor</strong> role automatically so you can donate here and open <em>your</em> portal
          (receipts + anonymized allocations). No resident-level data.
        </p>
        <div className="row" style={{ marginTop: 18, flexWrap: "wrap" }}>
          <Link className="btn primary" to="/register" state={{ from: loc.pathname }}>
            Create donor account
          </Link>
          <button className="btn" type="button" onClick={signInToDonate}>
            Sign in to donate
          </button>
          <Link className="btn" to="/impact">
            Public impact first
          </Link>
        </div>
      </div>

      <div className="card" style={{ padding: 18 }}>
        <p className="muted" style={{ margin: 0, lineHeight: 1.55 }}>
          Curious how programs are doing overall? The{" "}
          <Link to="/impact" style={{ textDecoration: "underline", fontWeight: 600 }}>
            public impact dashboard
          </Link>{" "}
          shows aggregated safehouse and program metrics—same mission, privacy-safe summaries.
        </p>
        {error ? (
          <div className="badge danger" style={{ marginTop: 12 }}>
            {error}
          </div>
        ) : null}
        {successId ? (
          <div className="badge ok" style={{ marginTop: 12 }}>
            Donation recorded. Contribution ID: {successId}
          </div>
        ) : null}
      </div>

      {!auth.isAuthenticated ? (
        <div className="card auth-panel" style={{ borderStyle: "dashed" }}>
          <h2 style={{ marginTop: 0 }}>Next step: sign in or register</h2>
          <p className="muted">
            Donating requires an account with the <strong>Donor</strong> role. Registration is free and takes about a
            minute—use the same email as your supporter record if we imported Lighthouse data.
          </p>
          <div className="row" style={{ marginTop: 14 }}>
            <Link className="btn primary" to="/register" state={{ from: loc.pathname }}>
              Create donor account
            </Link>
            <button className="btn" type="button" onClick={signInToDonate}>
              I already have an account
            </button>
          </div>
        </div>
      ) : !auth.hasRole("Donor") ? (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Donor role needed for this page</h2>
          <p className="muted">
            You’re signed in as staff. To test giving as a supporter, use a login that has the <strong>Donor</strong> role,
            or ask an admin to add Donor to a test account linked to a supporter.
          </p>
          <div className="row" style={{ marginTop: 14 }}>
            <Link className="btn primary" to="/register">
              Register a donor test account
            </Link>
            <Link className="btn" to="/app/dashboard">
              Staff dashboard
            </Link>
            <Link className="btn" to="/impact">
              Public impact
            </Link>
          </div>
        </div>
      ) : (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Make a donation</h2>
          <p className="muted">
            Demo flow: this records a donation in the internal system. In production, you would integrate a payment
            processor and confirm payment before recording.
          </p>

          <div className="row" style={{ alignItems: "end", marginTop: 10 }}>
            <label style={{ display: "grid", gap: 6, minWidth: 240 }}>
              <span className="muted">Amount (PHP)</span>
              <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 15000" />
            </label>
            <label style={{ display: "grid", gap: 6, flex: 1, minWidth: 260 }}>
              <span className="muted">Campaign</span>
              <input className="input" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
            </label>
          </div>

          <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
            <span className="muted">Notes (optional)</span>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional message…" />
          </label>

          <div className="row" style={{ marginTop: 12, justifyContent: "space-between" }}>
            <Link className="btn" to="/app/donor">
              Go to donor portal
            </Link>
            <button
              className="btn primary"
              disabled={busy}
              onClick={async () => {
                setError(null);
                setSuccessId(null);
                setBusy(true);
                try {
                  const amt = Number(amount.trim());
                  if (!Number.isFinite(amt) || amt <= 0) {
                    setError("Amount must be a positive number.");
                    return;
                  }

                  const res = await apiFetch<DonateResponse>("/api/donor/donate", {
                    method: "POST",
                    token: auth.token ?? undefined,
                    body: JSON.stringify({
                      amount: amt,
                      currency: "PHP",
                      campaignName: campaignName.trim() || null,
                      notes: notes.trim() || null,
                    }),
                  });
                  setSuccessId(res.contributionId);
                  setAmount("");
                  setNotes("");
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Submitting..." : "Donate (demo)"}
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ background: "var(--panel2)" }}>
        <div style={{ fontWeight: 900 }}>Privacy promise</div>
        <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
          Donor receipts and allocations are tied to supporter records. Resident-level information is never exposed on
          donor views.
        </div>
      </div>
    </div>
  );
}

