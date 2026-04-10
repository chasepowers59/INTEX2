import React from "react";
import { Link } from "react-router-dom";

const workSteps = [
  "Provide immediate safehouse and emergency support.",
  "Document counseling, wellbeing, education, and follow-up needs.",
  "Coordinate home visitation, family cooperation, and reintegration planning.",
  "Share public progress in ways that protect survivor privacy.",
];

const trustStats = [
  { value: "Safe", label: "survivor privacy comes before every public update" },
  { value: "Clear", label: "donors can see how support is used across care programs" },
  { value: "Human", label: "trained staff guide care decisions with data as support" },
  { value: "Hopeful", label: "every gift supports recovery, dignity, and a safer next step" },
];

const leadership = [
  {
    name: "Mina Park",
    role: "Executive Director",
    photo: "/photos/team-collaboration.jpg",
    description: "Guides the mission, partnerships, and survivor-centered operating model.",
  },
  {
    name: "Daniel Cho",
    role: "Donor Stewardship Lead",
    photo: "/photos/community-support.jpg",
    description: "Helps donors understand how their support becomes practical care.",
  },
  {
    name: "Jiwoo Han",
    role: "Survivor Services Coordinator",
    photo: "/photos/counseling-support.jpg",
    description: "Coordinates care pathways across safe shelter, follow-up, and wellbeing support.",
  },
  {
    name: "Grace Kim",
    role: "Program Impact Analyst",
    photo: "/photos/education-support.jpg",
    description: "Helps turn program progress into clear public updates that protect survivor privacy.",
  },
];

export function AboutPage() {
  return (
    <div className="about-page">
      <section className="about-hero card">
        <div className="about-hero-copy">
          <div className="sub-kicker">About Steps of Hope</div>
          <h1>We exist to help survivors move from immediate danger toward safety, healing, and hope.</h1>
          <p className="muted">
            Steps of Hope is a nonprofit concept focused on supporting South Korean survivors through safe shelter,
            trauma-informed follow-up, wellbeing services, education support, and careful reintegration planning.
          </p>
          <div className="donor-hero-actions">
            <Link className="btn primary donor-primary-cta" to="/donate">
              Support the mission
            </Link>
            <Link className="btn" to="/impact">
              View impact
            </Link>
          </div>
        </div>
        <div className="about-hero-image">
          <img src="/photos/community-support.jpg" alt="Volunteers preparing donor-backed care supplies." />
        </div>
      </section>

      <section className="card donor-section">
        <div className="section-intro">
          <div className="sub-kicker">Mission and vision</div>
          <h2 className="section-title">The purpose behind the work and the future we are working toward.</h2>
        </div>
        <div className="about-mission-grid">
          <article className="card about-mission-card">
            <div className="sub-kicker">Our mission</div>
            <h2>Help survivors find safety, care, and a path forward.</h2>
            <p className="muted">
              Donor support helps provide safe shelter, counseling, health and education support, home visits, and
              reintegration planning. We share progress in ways that keep survivors safe and private.
            </p>
          </article>
          <article className="card about-mission-card">
            <div className="sub-kicker">Our vision</div>
            <h2>A future where survivors are seen, protected, and supported.</h2>
            <p className="muted">
              We imagine a network of care where every survivor can access the next right step: protection, healing,
              trusted adults, education support, and a safer path forward.
            </p>
          </article>
        </div>
      </section>

      <section className="impact-stat-row" aria-label="About page trust metrics">
        {trustStats.map((stat) => (
          <div className="impact-stat-card" key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </section>

      <section className="about-work card">
        <div>
          <div className="sub-kicker">How we work</div>
          <h2 className="section-title">Support is strongest when care is coordinated.</h2>
          <p className="muted">
            Survivors need more than a single moment of help. This work depends on safe shelter, trusted adults,
            careful follow-up, and steady support from donors and partners.
          </p>
        </div>
        <ol className="about-step-list">
          {workSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="donor-story card">
        <div className="story-photo">
          <img src="/photos/shelter-recovery.jpg" alt="A calm safehouse recovery environment." />
        </div>
        <div className="story-copy">
          <div className="sub-kicker">Why donor trust matters</div>
          <h2 className="section-title">The work is personal. The reporting must be careful.</h2>
          <p className="muted">
            Donors should understand the difference their support makes, but survivors should never become public
            proof points. We share progress in a way that helps supporters stay informed while keeping private details
            protected.
          </p>
          <Link className="btn" to="/privacy">
            Read our privacy policy
          </Link>
        </div>
      </section>

      <section className="cta-ribbon donor-final-cta">
        <div className="sub-kicker">Your support helps make the pathway possible</div>
        <h2>Help fund shelter, care, and reintegration support for survivors.</h2>
        <Link className="btn primary donor-primary-cta" to="/donate">
          Donate now
        </Link>
      </section>
    </div>
  );
}
