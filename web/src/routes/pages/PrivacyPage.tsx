import React from "react";

export function PrivacyPage() {
  return (
    <div className="card">
      <h1 style={{ marginTop: 0 }}>Privacy Policy</h1>
      <p className="muted">
        Steps of Hope is committed to protecting sensitive information. This notice explains what we collect, why we
        collect it, how long we keep it, and how to request privacy-related help.
      </p>

      <h2>Controller and scope</h2>
      <p className="muted">
        Steps of Hope acts as the data controller for supporter account data, donor activity, and operational case
        management records. Public pages only display privacy-protected summary information.
      </p>

      <h2>What we collect</h2>
      <ul className="muted" style={{ lineHeight: 1.6 }}>
        <li>
          Account login information (username/email, password hash, roles) - including donor self-registration, which
          creates or links a supporter profile
        </li>
        <li>Operational case management data (resident records, counseling notes, home visits, conferences)</li>
        <li>Donor/supporter and contribution records (as needed for internal reporting)</li>
        <li>Optional preference cookies (theme)</li>
      </ul>

      <h2>How we use data</h2>
      <ul className="muted" style={{ lineHeight: 1.6 }}>
        <li>Run donor, staff, and reporting features that require sign-in</li>
        <li>Support case management work and safeguarding follow-up</li>
        <li>Publish privacy-protected impact updates on the public site</li>
        <li>Maintain audit trails for sensitive operational actions</li>
      </ul>

      <h2>Legal basis</h2>
      <ul className="muted" style={{ lineHeight: 1.6 }}>
        <li>Legitimate interests: operating donor reporting and case management</li>
        <li>Consent: optional preference cookies (for example, theme preference)</li>
        <li>Legal/safeguarding obligations: handling sensitive support records with restricted access</li>
      </ul>

      <h2>Data minimization and retention</h2>
      <ul className="muted" style={{ lineHeight: 1.6 }}>
        <li>Public views never expose resident-identifying details</li>
        <li>Role-based access limits who can view or modify sensitive records</li>
        <li>Only fields required for mission operations, donor stewardship, and compliance are retained</li>
        <li>Operational records are retained only as long as needed for program and legal obligations</li>
      </ul>

      <h2>Cookies</h2>
      <p className="muted">
        We use essential cookies to operate the site and optional cookies to store preferences (like theme). You can
        accept or reject optional cookies via the consent banner. If optional cookies are rejected, preferences are not
        saved between sessions.
      </p>

      <h2>Security</h2>
      <ul className="muted" style={{ lineHeight: 1.6 }}>
        <li>HTTPS/TLS is required for access</li>
        <li>Role-based access control restricts who can create/update/delete data</li>
        <li>Content Security Policy reduces the risk of script injection</li>
        <li>Password policy and account controls are enforced via ASP.NET Identity</li>
        <li>Infrastructure is hosted on Microsoft Azure with environment-based secret configuration</li>
      </ul>

      <h2>Data sharing and processors</h2>
      <p className="muted">
        We do not sell personal data. Data is processed by Steps of Hope personnel with role-based access and may be
        stored or processed by cloud infrastructure providers required to run this service.
      </p>

      <h2>International transfers</h2>
      <p className="muted">
        Where data is processed outside the original collection region, we apply contractual and technical safeguards
        appropriate to the deployment environment.
      </p>

      <h2>Incident response</h2>
      <p className="muted">
        Security events are investigated with audit logs and infrastructure telemetry. If a confirmed incident affects
        personal data, we follow applicable notification and remediation obligations.
      </p>

      <h2>Your rights (GDPR)</h2>
      <ul className="muted" style={{ lineHeight: 1.6 }}>
        <li>Right of access to personal data we hold about you</li>
        <li>Right to rectification of inaccurate account data</li>
        <li>Right to erasure where legally and operationally applicable</li>
        <li>Right to restrict or object to certain processing</li>
        <li>Right to data portability for data you provided directly</li>
      </ul>

      <h2>Contact</h2>
      <p className="muted">
        For privacy requests or questions, contact the site administrator via the Contact page. Requests are reviewed
        and answered through our protected internal process.
      </p>
    </div>
  );
}
