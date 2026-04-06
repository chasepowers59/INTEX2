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
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Give</h1>
        <p className="muted">
          Anyone can visit this page. To protect donor records and receipts, donors must sign in before making a donation
          or viewing personal donation history.
        </p>
        {error ? (
          <div className="badge danger" style={{ marginTop: 10 }}>
            {error}
          </div>
        ) : null}
        {successId ? (
          <div className="badge ok" style={{ marginTop: 10 }}>
            Donation recorded. Contribution ID: {successId}
          </div>
        ) : null}
      </div>

      {!auth.isAuthenticated ? (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Sign in required</h2>
          <p className="muted">
            Sign in to donate and to access your donor portal (history + allocations). If you don’t have an account, ask
            an admin for access.
          </p>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn primary" onClick={signInToDonate}>
              Sign in to donate
            </button>
            <Link className="btn" to="/impact">
              View public impact
            </Link>
          </div>
        </div>
      ) : !auth.hasRole("Donor") ? (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Donor access needed</h2>
          <p className="muted">
            You’re signed in, but this account doesn’t have Donor access. Ask an admin to assign the Donor role and link
            your account to a supporter record.
          </p>
          <div className="row" style={{ marginTop: 10 }}>
            <Link className="btn" to="/app/dashboard">
              Go to dashboard
            </Link>
            <Link className="btn" to="/impact">
              View public impact
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

