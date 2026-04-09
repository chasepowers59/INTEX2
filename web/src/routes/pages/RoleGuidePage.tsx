import React from "react";
import { Link } from "react-router-dom";

export function RoleGuidePage() {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Who can do what</h1>
        <p className="muted">
          Clear role boundaries protect sensitive survivor data while giving donors transparent impact visibility.
        </p>
        <div className="row" style={{ marginTop: 10 }}>
          <Link className="btn" to="/register">Donor start</Link>
          <Link className="btn" to="/login">Staff/Admin start</Link>
          <Link className="btn" to="/impact">Public impact</Link>
        </div>
      </div>

      <div className="card tone-aqua">
        <h2 style={{ marginTop: 0 }}>Public visitors</h2>
        <ul className="muted trust-list">
          <li>View mission, impact summaries, and donation prompts.</li>
          <li>Read privacy policy and consent settings.</li>
          <li>Create donor account through secure registration.</li>
        </ul>
      </div>

      <div className="card tone-peach">
        <h2 style={{ marginTop: 0 }}>Donor role</h2>
        <ul className="muted trust-list">
          <li>Submit donations and view personal donation history.</li>
          <li>View aggregated allocation outcomes tied to donor profile.</li>
          <li>Cannot access resident case data or staff operational tools.</li>
        </ul>
        <div className="row" style={{ marginTop: 10 }}>
          <Link className="btn primary" to="/register">Create donor account</Link>
          <Link className="btn" to="/app/donor">Open donor portal</Link>
        </div>
      </div>

      <div className="card tone-berry">
        <h2 style={{ marginTop: 0 }}>Employee and Admin roles</h2>
        <ul className="muted trust-list">
          <li>Use dashboard, caseload, process recording, home visit, and reports tools.</li>
          <li>Manage supporters and contribution records.</li>
          <li>Admin-only functions include user management, allocations admin, and data import controls.</li>
        </ul>
        <div className="row" style={{ marginTop: 10 }}>
          <Link className="btn" to="/app/dashboard">Open operations dashboard</Link>
          <Link className="btn" to="/app/admin/users">Admin users</Link>
        </div>
      </div>

      <div className="row">
        <Link className="btn primary" to="/register">Become a donor</Link>
        <Link className="btn" to="/login">Staff and donor sign in</Link>
      </div>
    </div>
  );
}
