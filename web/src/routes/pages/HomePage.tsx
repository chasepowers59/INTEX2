import React from "react";
import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div className="row" style={{ alignItems: "stretch" }}>
      <div className="card" style={{ flex: 2, minWidth: 300 }}>
        <h1 style={{ marginTop: 0 }}>A safer, smarter way to run a safehouse network</h1>
        <p className="muted">
          This portal helps leadership track resident progress, prevent cases from falling through the cracks, and
          connect operational outcomes to donor support—without exposing sensitive details.
        </p>
        <div className="row" style={{ marginTop: 12 }}>
          <Link className="btn primary" to="/impact">
            View public impact
          </Link>
          <Link className="btn" to="/login">
            Sign in (staff)
          </Link>
        </div>
      </div>

      <div className="card" style={{ flex: 1, minWidth: 260 }}>
        <div style={{ fontWeight: 800 }}>Leadership value</div>
        <ul className="muted" style={{ lineHeight: 1.6 }}>
          <li>Spot residents at risk and intervene earlier</li>
          <li>Monitor safehouse load and staffing needs</li>
          <li>Standardize process recordings and home visits</li>
          <li>Share anonymized impact snapshots publicly</li>
        </ul>
      </div>
    </div>
  );
}

