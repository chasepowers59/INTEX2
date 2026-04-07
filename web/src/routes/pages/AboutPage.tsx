import React from "react";
import { Link } from "react-router-dom";

export function AboutPage() {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>About Steps of Hope</h1>
        <p className="muted" style={{ lineHeight: 1.65 }}>
          Steps of Hope is a trauma-informed support platform focused on helping South Korean victims access safe shelter,
          follow-up care, and recovery pathways. The project combines donor transparency with strict privacy controls for
          sensitive operations.
        </p>
      </div>

      <div className="photo-grid">
        <div className="photo-placeholder" role="img" aria-label="Placeholder image: coordinated safehouse support team">
          <div className="caption">Photo placeholder: coordinated safehouse support team</div>
        </div>
        <div className="photo-placeholder" role="img" aria-label="Placeholder image: counseling and recovery support session">
          <div className="caption">Photo placeholder: counseling and recovery support</div>
        </div>
        <div className="photo-placeholder" role="img" aria-label="Placeholder image: donor-backed community resilience">
          <div className="caption">Photo placeholder: donor-backed community resilience</div>
        </div>
      </div>

      <div className="card" style={{ background: "var(--panel2)" }}>
        <h2 style={{ marginTop: 0 }}>Why this model works</h2>
        <ul className="muted trust-list">
          <li>Role-based access keeps sensitive resident workflows in staff-only views.</li>
          <li>Donors get clear contribution and allocation visibility without exposing identities.</li>
          <li>Leadership sees operational alerts and analytics for faster intervention decisions.</li>
          <li>Public impact pages provide aggregate outcomes suitable for accountability reporting.</li>
        </ul>
        <div className="row" style={{ marginTop: 12 }}>
          <Link className="btn primary" to="/give">
            Support the mission
          </Link>
          <Link className="btn" to="/impact">
            View public impact
          </Link>
          <Link className="btn" to="/roles">
            View role guide
          </Link>
        </div>
      </div>
    </div>
  );
}
