import React from "react";
import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div className="card hero-home" style={{ padding: 28 }}>
        <div className="hero-home-grid">
          <div>
            <div className="badge brand">
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
              <span className="brand-hero-text">
                Restore safety with transparent giving.
              </span>
            </h1>
            <p className="muted" style={{ maxWidth: 720, fontSize: 17, lineHeight: 1.55, margin: 0 }}>
              Steps of Hope coordinates support for South Korean victims across safehouses, follow-up services, and
              documented recovery milestones. Donors get a dedicated <strong>Donor</strong> experience to give, track allocations,
              and view aggregate impact safely.
            </p>

            <div className="row" style={{ marginTop: 22, flexWrap: "wrap" }}>
              <Link className="btn primary" to="/login">
                Sign in
              </Link>
              <Link className="btn nav-pill-glow" to="/give">
                Give
              </Link>
              <Link className="btn" to="/impact">
                Public impact
              </Link>
            </div>
          </div>
          <div className="hero-mosaic">
            <img src="/photos/team-collaboration.jpg" alt="Staff and partners coordinating support services." />
          </div>
        </div>
      </div>

      <div className="photo-grid">
        <div className="photo-placeholder" role="img" aria-label="Volunteers distributing care supplies in South Korea">
          <img src="/photos/community-support.jpg" alt="Volunteers preparing donation-backed community support kits." />
          <div className="caption">Emergency support distribution</div>
        </div>
        <div className="photo-placeholder" role="img" aria-label="Trauma-informed counseling and community support">
          <img src="/photos/counseling-support.jpg" alt="Trauma-informed counseling support session." />
          <div className="caption">Trauma-informed counseling support</div>
        </div>
        <div className="photo-placeholder" role="img" aria-label="Donor-supported recovery and shelter access">
          <img src="/photos/shelter-recovery.jpg" alt="Safehouse support and recovery environment." />
          <div className="caption">Donor-funded shelter and recovery</div>
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
        <div className="card panel2-bg" style={{ flex: 1, minWidth: 260, padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>For staff teams</div>
          <p className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
            Caseload and admin tools stay behind <strong>Admin</strong> and <strong>Employee</strong> roles—
            never mixed with donor-facing views.
          </p>
          <Link className="btn" to="/login" style={{ marginTop: 12 }}>
            Sign in
          </Link>
        </div>
        <div className="card panel2-bg" style={{ flex: 1, minWidth: 260, padding: 20 }}>
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
          <h2 style={{ marginTop: 0 }}>How we protect people and data</h2>
          <p className="muted">
            Public pages stay simple while sensitive details remain restricted by role and policy.
          </p>
          <ul className="muted trust-list">
            <li>No resident-identifying information is shown on donor or public pages.</li>
            <li>Staff-only actions require authenticated role checks.</li>
            <li>Published updates focus on aggregate impact and verified summaries.</li>
            <li>Audit-oriented reporting supports accountability for sensitive operations.</li>
          </ul>
        </div>
      </div>

      <div className="card">
        <div className="sub-kicker">What we do</div>
        <h2 className="section-title">Provide Safety, Healing, Justice, and Empowerment</h2>
        <div className="feature-grid-4">
          <div className="feature-tile">
            <div className="feature-icon safety">🛡</div>
            <div style={{ fontWeight: 800, fontSize: 28 }}>Safety</div>
            <p className="muted">We prioritize immediate protection, stable shelter, and critical follow-up workflows.</p>
          </div>
          <div className="feature-tile">
            <div className="feature-icon healing">❤</div>
            <div style={{ fontWeight: 800, fontSize: 28 }}>Healing</div>
            <p className="muted">Process recordings and interventions help teams document and support recovery journeys.</p>
          </div>
          <div className="feature-tile">
            <div className="feature-icon justice">⚖</div>
            <div style={{ fontWeight: 800, fontSize: 28 }}>Justice</div>
            <p className="muted">Case conferences and coordinated referrals strengthen legal and social protection outcomes.</p>
          </div>
          <div className="feature-tile">
            <div className="feature-icon empowerment">✦</div>
            <div style={{ fontWeight: 800, fontSize: 28 }}>Empowerment</div>
            <p className="muted">Donor-backed education, wellbeing, and reintegration support build long-term resilience.</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0, fontSize: 46, textAlign: "center" }}>Our Programs and Services</h2>
        <div className="program-grid">
          <div className="program-card">
            <div className="program-photo">
              <img src="/photos/community-support.jpg" alt="Program support and coordinated outreach." />
            </div>
            <div className="program-name">Physiological Needs</div>
          </div>
          <div className="program-card">
            <div className="program-photo">
              <img src="/photos/shelter-recovery.jpg" alt="Biological needs support through safe shelter and care access." />
            </div>
            <div className="program-name">Biological Needs</div>
          </div>
          <div className="program-card">
            <div className="program-photo">
              <img src="/photos/counseling-support.jpg" alt="Trauma-informed support for spiritual and emotional care." />
            </div>
            <div className="program-name">Spiritual Needs</div>
          </div>
          <div className="program-card">
            <div className="program-photo">
              <img src="/photos/wellbeing-checkin.jpg" alt="Psychological and wellbeing care check-ins." />
            </div>
            <div className="program-name">Psychological Needs</div>
          </div>
          <div className="program-card">
            <div className="program-photo">
              <img src="/photos/team-collaboration.jpg" alt="Social support and community engagement." />
            </div>
            <div className="program-name">Social Needs</div>
          </div>
          <div className="program-card">
            <div className="program-photo">
              <img src="/photos/education-support.jpg" alt="Education and belonging support activities." />
            </div>
            <div className="program-name">Love and Belonging</div>
          </div>
        </div>
      </div>

      <div className="cta-ribbon">
        <h2>Bring safety, healing, and empowerment to children in need</h2>
        <Link className="btn primary" to="/give" style={{ marginTop: 16 }}>
          Donate now
        </Link>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0, textAlign: "center", fontSize: 46 }}>Board of Directors</h2>
        <div className="avatar-row">
          <div className="avatar-bubble"><img src="/photos/team-collaboration.jpg" alt="Board member profile visual 1." /></div>
          <div className="avatar-bubble"><img src="/photos/counseling-support.jpg" alt="Board member profile visual 2." /></div>
          <div className="avatar-bubble"><img src="/photos/community-support.jpg" alt="Board member profile visual 3." /></div>
          <div className="avatar-bubble"><img src="/photos/education-support.jpg" alt="Board member profile visual 4." /></div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0, textAlign: "center", fontSize: 50 }}>Recent Posts</h2>
        <div className="post-grid">
          <article className="post-card">
            <div className="post-photo">
              <img src="/photos/wellbeing-checkin.jpg" alt="Survivor care progress check-in scene." />
            </div>
            <div className="post-body">
              <div className="muted" style={{ fontSize: 12 }}>May 11, 2025</div>
              <div style={{ fontWeight: 800, fontSize: 24, marginTop: 6 }}>Highs and Lows of Survivor Care</div>
              <p className="muted">A reflection on field realities and the importance of consistent support systems.</p>
              <Link className="btn" to="/about">Read more</Link>
            </div>
          </article>
          <article className="post-card">
            <div className="post-photo">
              <img src="/photos/community-support.jpg" alt="Campaign storytelling and donor engagement visual." />
            </div>
            <div className="post-body">
              <div className="muted" style={{ fontSize: 12 }}>December 11, 2024</div>
              <div style={{ fontWeight: 800, fontSize: 24, marginTop: 6 }}>The Power of Light</div>
              <p className="muted">How targeted donor campaigns can unlock real pathways to safety and recovery.</p>
              <Link className="btn" to="/impact">Read more</Link>
            </div>
          </article>
          <article className="post-card">
            <div className="post-photo">
              <img src="/photos/education-support.jpg" alt="Milestones in education and reintegration support." />
            </div>
            <div className="post-body">
              <div className="muted" style={{ fontSize: 12 }}>September 12, 2023</div>
              <div style={{ fontWeight: 800, fontSize: 24, marginTop: 6 }}>Thankful to Celebrate 5 Years</div>
              <p className="muted">Milestones from safehouse operations, reintegration support, and donor impact growth.</p>
              <Link className="btn" to="/roles">Read more</Link>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
