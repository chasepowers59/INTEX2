import React from "react";
import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div className="card hero-home" style={{ padding: 28 }}>
        <div className="badge" style={{ borderColor: "rgba(124,108,255,0.45)", background: "rgba(124,108,255,0.1)" }}>
          Privacy-first operations · Role-based donor access
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
          Safer programs.
          <br />
          <span
            style={{
              background: "linear-gradient(90deg, var(--brand), var(--brand2))",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Stronger stewardship.
          </span>
        </h1>
        <p className="muted" style={{ maxWidth: 720, fontSize: 17, lineHeight: 1.55, margin: 0 }}>
          Steps of Hope coordinates survivor support across safehouses—follow-ups, documentation, and anonymized impact—
          while giving supporters a dedicated <strong>Donor</strong> experience to give and track personal impact.
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
    </div>
  );
}
