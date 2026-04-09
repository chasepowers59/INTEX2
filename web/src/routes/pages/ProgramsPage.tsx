import React from "react";
import { Link } from "react-router-dom";

const careSteps = [
  {
    id: "shelter",
    kicker: "Step one",
    title: "Safe Shelter and Crisis Support",
    image: "/photos/shelter-recovery.jpg",
    summary:
      "Immediate safehouse support helps survivors move from danger into a stable, protected environment.",
    details:
      "Donor support helps cover safe space, essential supplies, meals, transportation coordination, and the first steps of case follow-up.",
    outcomes: ["Emergency essentials", "Safehouse care", "Initial case follow-up"],
  },
  {
    id: "healing",
    kicker: "Step two",
    title: "Healing and Case Care",
    image: "/photos/counseling-support.jpg",
    summary:
      "Trauma-informed support helps staff document needs, track progress, and coordinate the next right step.",
    details:
      "This step focuses on counseling notes, emotional wellbeing, intervention planning, and careful follow-up with trained staff.",
    outcomes: ["Counseling documentation", "Wellbeing check-ins", "Follow-up planning"],
  },
  {
    id: "education",
    kicker: "Step three",
    title: "Education and Wellbeing Support",
    image: "/photos/education-support.jpg",
    summary:
      "Long-term recovery includes practical support for learning, health, confidence, and daily stability.",
    details:
      "Donations help fund education support, health progress tracking, skills development, and resources that make recovery more sustainable.",
    outcomes: ["Education progress", "Health support", "Daily stability"],
  },
  {
    id: "reintegration",
    kicker: "Step four",
    title: "Reintegration and Family Follow-Up",
    image: "/photos/wellbeing-checkin.jpg",
    summary:
      "Care does not stop at the safehouse door. Reintegration planning helps survivors move toward safer long-term support.",
    details:
      "Staff use home visits, family cooperation notes, case conferences, and reintegration planning to support a thoughtful path forward.",
    outcomes: ["Home visitation", "Case conferences", "Reintegration planning"],
  },
];

const supportItems = [
  "Donors can see how support helps across each step of care.",
  "Public updates protect survivor privacy.",
  "Care decisions stay with trained staff.",
];

export function ProgramsPage() {
  return (
    <div className="programs-page">
      <section className="programs-hero card">
        <div className="programs-hero-copy">
          <div className="sub-kicker">How we help</div>
          <h1>A step-by-step care pathway from crisis to stability.</h1>
          <p className="muted">
            Steps of Hope connects donor generosity to one coordinated pathway of care: safe shelter, healing support,
            education and wellbeing, and reintegration follow-up. Each step is designed to support survivors while
            protecting their privacy.
          </p>
          <div className="donor-hero-actions">
            <Link className="btn primary donor-primary-cta" to="/donate">
              Support this program
            </Link>
            <Link className="btn" to="/impact">
              View impact
            </Link>
          </div>
        </div>
        <div className="programs-hero-card" aria-label="Program pathway">
          <span>Safety</span>
          <span>Healing</span>
          <span>Wellbeing</span>
          <span>Reintegration</span>
        </div>
      </section>

      <section className="programs-overview-grid" aria-label="Care pathway overview">
        {careSteps.map((step) => (
          <a className="program-overview-card" href={`#${step.id}`} key={step.id}>
            <span>{step.kicker}</span>
            <strong>{step.title}</strong>
          </a>
        ))}
      </section>

      <section className="programs-detail-list" aria-label="Care pathway details">
        {careSteps.map((step) => (
          <article className="program-detail card" id={step.id} key={step.id}>
            <div className="program-detail-image">
              <img src={step.image} alt={`${step.title} support.`} />
            </div>
            <div className="program-detail-copy">
              <div className="sub-kicker">{step.kicker}</div>
              <h2 className="section-title">{step.title}</h2>
              <p className="program-summary">{step.summary}</p>
              <p className="muted">{step.details}</p>
              <div className="program-outcomes" aria-label={`${step.title} outcomes`}>
                {step.outcomes.map((outcome) => (
                  <span key={outcome}>{outcome}</span>
                ))}
              </div>
              <Link className="btn primary donor-primary-cta" to="/donate">
                Help fund this work
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section className="impact-preview card">
        <div>
          <div className="sub-kicker">How support is stewarded</div>
          <h2 className="section-title">Clear reporting without exposing survivor stories.</h2>
          <p className="muted">
            Donors should understand how their support helps, but survivor safety comes first. Public pathway reporting
            focuses on clear progress updates while protecting private details.
          </p>
          <Link className="btn" to="/impact">
            Explore public impact
          </Link>
        </div>
        <div className="program-support-list">
          {supportItems.map((item) => (
            <div key={item}>{item}</div>
          ))}
        </div>
      </section>

      <section className="cta-ribbon donor-final-cta">
        <div className="sub-kicker">Support the full care pathway</div>
        <h2>Your gift can help fund safety, healing, education, and reintegration support.</h2>
        <Link className="btn primary donor-primary-cta" to="/donate">
          Donate now
        </Link>
      </section>
    </div>
  );
}
