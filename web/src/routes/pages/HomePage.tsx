import React from "react";
import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div className="card hero-home" style={{ padding: 28 }}>
        <div className="badge" style={{ borderColor: "rgba(124,108,255,0.45)", background: "rgba(124,108,255,0.1)" }}>
          South Korea response focus · Privacy-first operations · Role-based donor access
        </div>
        <h1
          style={{
            marginTop: 14,
            marginBottom: 10,
            fontSize: "clamp(32px, 5vw, 46px)",
            lineHeight: 1.06,
            fontWeight: 800,
            letterSpacing: "-0.03em",
          }}
        >
          Stand with South Korean victims.
          <br />
          <span
            style={{
              background: "linear-gradient(90deg, var(--brand), var(--brand2))",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Restore safety with transparent giving.
          </span>
        </h1>
        <p className="muted" style={{ maxWidth: 720, fontSize: 17, lineHeight: 1.55, margin: 0 }}>
          Steps of Hope coordinates survivor support for South Korean victims across safehouses, follow-up services, and
          documented recovery milestones. Donors get a dedicated <strong>Donor</strong> experience to give, track allocations,
          and view aggregate impact safely.
        </p>

        <div className="row" style={{ marginTop: 22, flexWrap: "wrap" }}>
          <Link className="btn primary" to="/register">
            Join as donor — free
          </Link>
          <Link className="btn nav-pill-glow" to="/give">
            Give
          </Link>
          <Link className="btn" to="/login">
            Staff & donor sign in
          </Link>
          <Link className="btn" to="/impact">
            Public impact
          </Link>
        </div>
      </div>

      <div className="photo-grid">
        <div className="photo-placeholder" role="img" aria-label="Generated placeholder: volunteers distributing care supplies in South Korea">
          <div className="caption">Photo placeholder: emergency support distribution</div>
        </div>
        <div className="photo-placeholder" role="img" aria-label="Generated placeholder: trauma-informed counseling and community support">
          <div className="caption">Photo placeholder: trauma-informed counseling support</div>
        </div>
        <div className="photo-placeholder" role="img" aria-label="Generated placeholder: donor-supported recovery and shelter access">
          <div className="caption">Photo placeholder: donor-funded shelter and recovery</div>
        </div>
      </div>

      <div className="row" style={{ alignItems: "stretch" }}>
        <div className="card glow-donor" style={{ flex: 1, minWidth: 260, padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>For supporters</div>
          <p className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
            Register once. You receive the <strong>Donor</strong> role automatically—submit gifts, view receipts, and see
            where funds flow at a safe, aggregated level.
          </p>
          <Link className="btn primary" to="/register" style={{ marginTop: 12 }}>
            Create donor account
          </Link>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 260, padding: 20, background: "var(--panel2)" }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>For leadership & staff</div>
          <p className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
            Caseload, ML insights, and admin tools stay behind <strong>Admin</strong> and <strong>Employee</strong> roles—
            never mixed with donor-facing views.
          </p>
          <Link className="btn" to="/login" style={{ marginTop: 12 }}>
            Sign in
          </Link>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 260, padding: 20, background: "var(--panel2)" }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>For everyone</div>
          <p className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
            Explore published snapshots: safehouse momentum, programs, and outreach—aggregated only, no resident data.
          </p>
          <Link className="btn" to="/impact" style={{ marginTop: 12 }}>
            View impact
          </Link>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Why donors trust this platform</h2>
        <ul className="muted trust-list">
          <li>Mission-specific framing for South Korean victim recovery and protection.</li>
          <li>Privacy-first reporting with no resident-identifying details in donor views.</li>
          <li>Clear role separation between donor tools and staff operations.</li>
          <li>Traceable contribution and allocation records in your donor portal.</li>
        </ul>
      </div>

      <div className="row" style={{ alignItems: "stretch" }}>
        <div className="card tone-peach" style={{ flex: 1, minWidth: 260 }}>
          <h2 style={{ marginTop: 0 }}>Social media strategy</h2>
          <p className="muted">
            We use responsible campaign storytelling to expand donor reach while protecting survivor privacy.
          </p>
          <ul className="muted trust-list">
            <li>Platform-specific creative plans for Instagram, YouTube, and short-form channels.</li>
            <li>Referral-based performance tracking tied to estimated donation value.</li>
            <li>Monthly impact recap posts with verified aggregate metrics.</li>
          </ul>
        </div>
        <div className="card tone-aqua" style={{ flex: 1, minWidth: 260 }}>
          <h2 style={{ marginTop: 0 }}>ML pipelines in this project</h2>
          <p className="muted">
            Predictive workflows support safer operations and smarter stewardship.
          </p>
          <ul className="muted trust-list">
            <li>Resident risk and readiness signals for proactive follow-up.</li>
            <li>Donor lapse and donor upgrade propensity models.</li>
            <li>Next-best campaign guidance for targeted donor engagement.</li>
            <li>Safehouse capacity forecasting and social post donation referral insights.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
