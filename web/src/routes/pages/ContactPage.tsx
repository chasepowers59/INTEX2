import React from "react";
import { Link } from "react-router-dom";

export function ContactPage() {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Contact & Donor Relations</h1>
        <p className="muted" style={{ lineHeight: 1.65 }}>
          We welcome questions from donors, partners, and social service teams supporting South Korean victims. For urgent
          case escalation, contact your assigned staff lead through internal channels.
        </p>
      </div>

      <div className="card" style={{ background: "var(--panel2)" }}>
        <h2 style={{ marginTop: 0 }}>Reach us</h2>
        <ul className="muted trust-list">
          <li>General support: support@stepsofhope.org</li>
          <li>Donor relations: donors@stepsofhope.org</li>
          <li>Program partnerships: partnerships@stepsofhope.org</li>
          <li>Response line: +82 02-555-0147</li>
        </ul>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Need a quick action?</h2>
        <div className="row">
          <Link className="btn primary" to="/give">
            Donate now
          </Link>
          <Link className="btn" to="/register">
            Create donor account
          </Link>
          <Link className="btn" to="/impact">
            See impact snapshots
          </Link>
        </div>
      </div>
    </div>
  );
}
