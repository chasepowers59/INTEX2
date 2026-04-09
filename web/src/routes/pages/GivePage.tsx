import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { formatSiteCurrency, SITE_CURRENCY } from "../../lib/currency";

type DonateResponse = { contributionId: number };
type DonationConfirmation = {
  contributionId: number;
  contributionType: string;
  amountLabel: string;
  givingFocus: string;
};

const DRAFT_KEY = "donation_draft";

type DonationDraft = {
  amount?: string;
  givingFocus?: string;
  notes?: string;
};

function readDonationDraft(): DonationDraft {
  try {
    const saved = sessionStorage.getItem(DRAFT_KEY);
    if (!saved) return {};
    return JSON.parse(saved) as DonationDraft;
  } catch {
    sessionStorage.removeItem(DRAFT_KEY);
    return {};
  }
}

const givingFocusOptions = [
  "General Fund",
  "Safe Shelter",
  "Counseling and Wellbeing",
  "Education Support",
  "Reintegration Planning",
];

const confidenceItems = [
  "Secure donor account",
  "Anonymized impact summaries",
  "No resident-level public data",
];

const giftProvides = ["Safe shelter", "Counseling support", "Education and wellbeing", "Reintegration planning"];

const waysToSupport = [
  "One-time monetary gifts",
  "In-kind care items",
  "Volunteer time",
  "Skills-based support",
  "Social advocacy",
];

export function GivePage() {
  const auth = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const inAppShell = loc.pathname.startsWith("/app/");
  const impactRoute = inAppShell ? "/app/impact" : "/impact";
  const initialDraft = readDonationDraft();

  const [amount, setAmount] = useState<string>(initialDraft.amount ?? "");
  const [givingFocus, setGivingFocus] = useState<string>(initialDraft.givingFocus ?? "General Fund");
  const [notes, setNotes] = useState<string>(initialDraft.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);
  const [confirmation, setConfirmation] = useState<DonationConfirmation | null>(null);

  useEffect(() => {
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        amount,
        givingFocus,
        notes,
      }),
    );
  }, [amount, givingFocus, notes]);

  useEffect(() => {
    setError(null);
    setSuccessId(null);
    setConfirmation(null);
  }, [auth.isAuthenticated, auth.roles.join(",")]);

  const signInToDonate = () => {
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        amount,
        givingFocus,
        notes,
      }),
    );
    nav("/login", { state: { from: loc.pathname } });
  };

  const donorLoggedIn = auth.isAuthenticated && auth.hasRole("Donor");

  async function submitDonation() {
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
          contributionType: "Monetary",
          amount: amt,
          estimatedValue: null,
          impactUnit: null,
          currency: SITE_CURRENCY,
          campaignName: givingFocus.trim() || null,
          notes: notes.trim() || null,
          inKindItems: [],
        }),
      });

      setSuccessId(res.contributionId);
      setConfirmation({
        contributionId: res.contributionId,
        contributionType: "Monetary",
        amountLabel: formatSiteCurrency(amt),
        givingFocus: givingFocus.trim() || "General Fund",
      });
      setAmount("");
      setNotes("");
      sessionStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="donate-page">
      <section className="donate-action-hero" id="donation-form">
        <div className="card donate-form-card donate-primary-form">
          <div className="donate-form-header">
            <div>
              <div className="sub-kicker">Donate now</div>
              <h1>Make a difference today.</h1>
            </div>
          </div>

          <p className="muted">
            Enter an amount and choose where you would like your support directed.{" "}
            {donorLoggedIn
              ? "Your gift will be saved to your donor account."
              : "Sign in or create a donor account to complete your gift."}
          </p>

          <div className="donate-form-grid donate-form-grid--amount-first">
            <label className="donate-amount-field">
              <span>Amount in KRW</span>
              <input
                className="input"
                type="number"
                min="1"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 50000"
              />
            </label>
            <label>
              <span>Where should your gift help most?</span>
              <select className="input" value={givingFocus} onChange={(e) => setGivingFocus(e.target.value)}>
                {givingFocusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="donate-notes-field">
            <span>Notes, optional</span>
            <input
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional message..."
            />
          </label>

          <div className="donate-provides-strip" aria-label="Your gift helps provide">
            <strong>Your gift helps provide</strong>
            {giftProvides.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>

          {error ? <div className="badge danger">{error}</div> : null}
          {successId ? <div className="badge ok">Donation recorded. Contribution ID: {successId}</div> : null}

          <div className="donate-form-actions">
            {!auth.isAuthenticated ? (
              <>
                <span className="muted">Sign in or create a free donor account to continue.</span>
                <button className="btn primary donor-primary-cta" type="button" onClick={signInToDonate}>
                  Sign in or create account
                </button>
              </>
            ) : !auth.hasRole("Donor") ? (
              <>
                <span className="muted">You are signed in as staff. A Donor role is required to record a donation.</span>
                <Link className="btn" to="/app/dashboard">
                  Staff dashboard
                </Link>
              </>
            ) : (
              <>
                <span className="muted">Your gift will be saved to your donor account.</span>
                <button className="btn primary donor-primary-cta" disabled={busy} onClick={submitDonation}>
                  {busy ? "Submitting..." : "Donate now"}
                </button>
              </>
            )}
          </div>
        </div>

        <aside className="card donate-quick-trust">
          <div className="badge donor-role-badge">Privacy-first giving</div>
          <h2>Your gift supports the full care pathway.</h2>
          <p className="muted">
            Your support helps fund shelter, care, and reintegration work while keeping survivor privacy protected.
          </p>
          <div className="donate-trust-list">
            {confidenceItems.map((item) => (
              <div key={item}>{item}</div>
            ))}
          </div>
          <div className="donor-hero-actions">
            <Link className="btn" to={impactRoute}>
              {inAppShell ? "See impact" : "See public impact"}
            </Link>
            <Link className="btn" to="/programs">
              How we help
            </Link>
          </div>
        </aside>
      </section>

      <section className="donate-supporting-grid">
        <div className="card donate-confidence-card">
          <div className="sub-kicker">Ways to support</div>
          <h2>More than one kind of gift matters.</h2>
          <ul className="muted mini-widget-list">
            {waysToSupport.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="card donate-confidence-card tone-privacy-peach">
          <div className="sub-kicker">Privacy promise</div>
          <h2>Transparent to donors. Protective of survivors.</h2>
          <p className="muted">
            Donors can see their giving activity and public updates without exposing private survivor information.
          </p>
          <Link className="btn" to="/privacy">
            Read privacy policy
          </Link>
        </div>
      </section>

      <section className="donor-story card">
        <div className="story-photo">
          <img src="/photos/shelter-recovery.jpg" alt="Safehouse recovery environment supported by donors." />
        </div>
        <div className="story-copy">
          <div className="sub-kicker">Where support goes</div>
          <h2 className="section-title">Your gift supports practical care from first safety to reintegration.</h2>
          <p className="muted">
            Donor support makes the everyday work possible: supplies, safehouse care, follow-up notes, education support,
            home visits, and careful planning for safer next steps.
          </p>
          <Link className="btn" to="/programs">
            See how we help
          </Link>
        </div>
      </section>

      {confirmation ? (
        <div className="donation-modal-backdrop">
          <div className="card glow-donor donation-modal donation-modal--success">
            <h2 style={{ marginTop: 0 }}>Donation confirmed</h2>
            <p className="muted" style={{ lineHeight: 1.6 }}>
              Thank you. Your gift has been received.
            </p>
            <div className="row" style={{ marginTop: 8, flexWrap: "wrap" }}>
              <span className="badge ok">Confirmation ID: {confirmation.contributionId}</span>
              <span className="badge">{confirmation.contributionType}</span>
              <span className="badge">{confirmation.amountLabel}</span>
              <span className="badge">{confirmation.givingFocus}</span>
            </div>
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn primary" onClick={() => setConfirmation(null)}>
                Close
              </button>
              <Link className="btn" to="/app/donor" onClick={() => setConfirmation(null)}>
                Open donor portal
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
