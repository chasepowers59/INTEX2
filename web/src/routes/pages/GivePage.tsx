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
      <div className="card glow-donor tone-berry" style={{ padding: 26 }}>
        <div className="badge donor-role-badge" style={{ marginBottom: 12 }}>
          Secure giving for South Korean victims · Donor role after sign-in
        </div>
        <h1 style={{ marginTop: 0, fontSize: "clamp(28px, 4vw, 38px)", fontWeight: 800, letterSpacing: "-0.03em" }}>
          Give with confidence and compassion
        </h1>
        <p className="muted" style={{ fontSize: 16, lineHeight: 1.6, maxWidth: 760, margin: 0 }}>
          Your gift supports safe shelter, case follow-up, and recovery services for South Korean victims. Create a{" "}
          <strong>donor account</strong> in one minute—we assign the <strong>Donor</strong> role automatically so you can
          donate here and open <em>your</em> portal with receipts and anonymized allocations. No resident-level data.
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

      <div className="photo-grid">
        <div className="photo-placeholder" role="img" aria-label="Donor welcome image for Korean victim support">
          <img src="/reference/hero-ribbon.png" alt="Community welcome and safehouse support." />
          <div className="caption">Donor welcome for Korean victim support</div>
        </div>
        <div className="photo-placeholder" role="img" aria-label="Care package preparation">
          <img src="/reference/donor-impact-community.jpg" alt="Donation and care package preparation." />
          <div className="caption">Care package preparation</div>
        </div>
        <div className="photo-placeholder" role="img" aria-label="Community resilience and rebuilding">
          <img src="/reference/education-reintegration-support.jpg" alt="Education and reintegration support in community settings." />
          <div className="caption">Community resilience and rebuilding</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(260px,1fr)", gap: 12 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <div className="card" style={{ padding: 18 }}>
            <p className="muted" style={{ margin: 0, lineHeight: 1.55 }}>
              Curious how programs for South Korean victims are doing overall? The{" "}
              <Link to="/impact" style={{ textDecoration: "underline", fontWeight: 600 }}>
                public impact dashboard
              </Link>{" "}
              shows aggregated safehouse and program metrics with privacy-safe summaries.
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
            <div className="card auth-panel tone-aqua" style={{ borderStyle: "dashed" }}>
              <h2 style={{ marginTop: 0 }}>Next step: sign in or register</h2>
              <p className="muted">
                Donating requires an account with the <strong>Donor</strong> role. Registration is free and takes about a
                minute—use the same email as your supporter record if we imported legacy program data.
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
            <div className="card tone-peach">
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
            <div className="card tone-aqua">
              <h2 style={{ marginTop: 0 }}>Choose your donation amount</h2>
              <p className="muted">
                You can select a quick amount below or enter your own value. Your contribution is recorded to your donor profile.
              </p>

              <div className="row" style={{ marginTop: 8 }}>
                {[25, 55, 100, 250, 500, 1000].map((v) => (
                  <button key={v} type="button" className="btn" onClick={() => setAmount(String(v))}>
                    ₱{v}
                  </button>
                ))}
              </div>

              <div className="row" style={{ alignItems: "end", marginTop: 12 }}>
                <label style={{ display: "grid", gap: 6, minWidth: 240 }}>
                  <span className="muted">Amount in PHP</span>
                  <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 15000" />
                </label>
                <label style={{ display: "grid", gap: 6, flex: 1, minWidth: 260 }}>
                  <span className="muted">Campaign</span>
                  <input className="input" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
                </label>
              </div>

              <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
                <span className="muted">Notes, optional</span>
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
                  {busy ? "Submitting..." : "Donate now"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div className="card tone-peach">
            <h3 style={{ marginTop: 0 }}>Recent stories</h3>
            <ul className="muted mini-widget-list">
              <li>Wheels of Hope transport initiative</li>
              <li>Safehouse education continuity updates</li>
              <li>Family reconnection support highlights</li>
              <li>Community legal aid partnerships</li>
            </ul>
          </div>
          <div className="card tone-berry">
            <h3 style={{ marginTop: 0 }}>Social media for mission growth</h3>
            <ul className="muted mini-widget-list">
              <li>Instagram impact stories with referral links</li>
              <li>Short-form video campaigns for donor trust</li>
              <li>Monthly donor recap posts with transparent metrics</li>
            </ul>
          </div>
          <div className="card tone-aqua">
            <h3 style={{ marginTop: 0 }}>Archives and updates</h3>
            <ul className="muted mini-widget-list">
              <li>May 2026 impact summary</li>
              <li>April 2026 donor allocation report</li>
              <li>Quarter one field follow-up review</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="card panel2-bg">
        <div style={{ fontWeight: 900 }}>Privacy promise</div>
        <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
          Donor receipts and allocations are tied to supporter records. Resident-level information is never exposed on
          donor views.
        </div>
        <ul className="muted trust-list">
          <li>Funds are tracked against campaign and category for transparent stewardship.</li>
          <li>Donor portal access is role-protected and account-specific.</li>
          <li>Impact reporting remains aggregate to protect victim privacy.</li>
        </ul>
      </div>
    </div>
  );
}

