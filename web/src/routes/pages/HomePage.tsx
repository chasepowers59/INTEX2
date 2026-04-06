import React from "react";
import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card" style={{ padding: 20 }}>
        <div className="badge" style={{ borderColor: "rgba(124,108,255,0.45)", background: "rgba(124,108,255,0.08)" }}>
          Privacy-first case operations & donor stewardship
        </div>
        <h1 style={{ marginTop: 12, marginBottom: 8, fontSize: 40, lineHeight: 1.05 }}>
          Run safer programs.
          <br />
          Keep support strong.
        </h1>
        <p className="muted" style={{ maxWidth: 850, fontSize: 16 }}>
          Steps of Hope helps leadership coordinate survivor support across safehouses—tracking follow-ups, counseling
          documentation, and anonymized impact outcomes—without exposing sensitive details.
        </p>

        <div className="row" style={{ marginTop: 14 }}>
          <Link className="btn primary" to="/login">
            Sign in
          </Link>
          <Link className="btn" to="/register">
            Register as donor
          </Link>
          <Link className="btn" to="/impact">
            View public impact
          </Link>
        </div>
      </div>

      <div className="row" style={{ alignItems: "stretch" }}>
        <div className="card" style={{ flex: 1, minWidth: 260, background: "var(--panel2)" }}>
          <div style={{ fontWeight: 900 }}>Prevent gaps</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
            Flag overdue check-ins and missing process recordings so residents don’t fall through the cracks.
          </div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 260, background: "var(--panel2)" }}>
          <div style={{ fontWeight: 900 }}>Standardize care</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
            Use structured counseling notes and home visitation templates to keep documentation consistent.
          </div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 260, background: "var(--panel2)" }}>
          <div style={{ fontWeight: 900 }}>Show impact safely</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
            Publish aggregated snapshots for donors and the public—no resident-level data.
          </div>
        </div>
      </div>
    </div>
  );
}
