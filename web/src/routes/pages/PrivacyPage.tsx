import React from "react";

export function PrivacyPage() {
  return (
    <div className="card">
      <h1 style={{ marginTop: 0 }}>Privacy Policy</h1>
      <p className="muted">
        This is a student project. The organization data is sensitive by design. We apply least-privilege access and
        minimize exposure of any resident-related information.
      </p>

      <h2>What we collect</h2>
      <ul className="muted" style={{ lineHeight: 1.6 }}>
        <li>
          Account login information (username/email, password hash, roles)—including donor self-registration, which creates
          or links a supporter profile
        </li>
        <li>Operational case management data (resident records, counseling notes, home visits, conferences)</li>
        <li>Donor/supporter and contribution records (as needed for internal reporting)</li>
        <li>Optional preference cookies (theme)</li>
      </ul>

      <h2>How we use data</h2>
      <ul className="muted" style={{ lineHeight: 1.6 }}>
        <li>Run the leadership dashboard and reporting features</li>
        <li>Support internal case management workflows</li>
        <li>Publish anonymized, aggregated impact snapshots on the public dashboard</li>
      </ul>

      <h2>Cookies</h2>
      <p className="muted">
        We use essential cookies to operate the site and optional cookies to store preferences (like theme). You can
        accept or reject optional cookies via the consent banner.
      </p>

      <h2>Security</h2>
      <ul className="muted" style={{ lineHeight: 1.6 }}>
        <li>HTTPS/TLS is required for access</li>
        <li>Role-based access control restricts who can create/update/delete data</li>
        <li>Content Security Policy reduces the risk of script injection</li>
      </ul>

      <h2>Contact</h2>
      <p className="muted">For questions about this project, contact the site administrator.</p>
    </div>
  );
}

