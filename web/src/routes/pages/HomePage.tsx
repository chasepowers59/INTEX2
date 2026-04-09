import React from "react";
import { Link } from "react-router-dom";

const impactStats = [
  { value: "60", label: "survivors supported through care services" },
  { value: "9", label: "safehouses supported by donor generosity" },
  { value: "812", label: "outreach posts reviewed to strengthen donor reach" },
  { value: "100%", label: "public updates designed to protect survivor privacy" },
];

const giftOptions = [
  {
    amount: "$25",
    title: "Emergency essentials",
    description: "Helps provide hygiene items, transport support, and immediate care supplies.",
  },
  {
    amount: "$50",
    title: "Counseling and wellbeing",
    description: "Supports trauma-informed follow-up, wellbeing check-ins, and recovery documentation.",
  },
  {
    amount: "$100",
    title: "Safe shelter support",
    description: "Helps fund safehouse services, meals, case follow-up, and day-to-day protection.",
  },
  {
    amount: "$250",
    title: "Reintegration planning",
    description: "Supports family assessment, home visitation, education needs, and long-term care planning.",
  },
];

const trustItems = [
  "Public updates protect survivor privacy.",
  "Gifts are tracked across shelter, care, and reintegration support.",
  "Donors see broad results without exposing private details.",
  "Sensitive case information stays with authorized staff.",
];

export function HomePage() {
  return (
    <div className="donor-landing">
      <section className="donor-hero card">
        <div className="donor-hero-copy">
          <h1>Help survivors find safety, healing, and a path forward.</h1>
          <p>
            Your gift helps Steps of Hope fund safe shelter, counseling support, education and wellbeing services,
            home visitation, and reintegration planning while protecting every survivor's identity.
          </p>
          <div className="donor-hero-actions">
            <Link className="btn primary donor-primary-cta" to="/donate">
              Donate now
            </Link>
            <Link className="btn" to="/impact">
              See your impact
            </Link>
          </div>
          <div className="donor-trust-strip" aria-label="Donor trust commitments">
            <span>Secure giving</span>
            <span>Anonymized reporting</span>
            <span>Transparent allocations</span>
          </div>
        </div>
        <div className="donor-hero-visual">
          <img src="/photos/shelter-recovery.jpg" alt="A calm safehouse recovery space supported by donors." />
          <div className="donor-hero-note">
            <strong>Every gift becomes practical support.</strong>
            <span>Shelter, counseling, education, wellbeing, and reintegration care.</span>
          </div>
        </div>
      </section>

      <section className="impact-stat-row" aria-label="Impact highlights">
        {impactStats.map((stat) => (
          <div className="impact-stat-card" key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </section>

      <section className="card donor-section">
        <div className="section-intro">
          <div className="sub-kicker">What your gift provides</div>
          <h2 className="section-title">Turn compassion into concrete care.</h2>
          <p className="muted">
            Here are a few examples of what a gift can help provide for survivors and the staff supporting them.
          </p>
        </div>
        <div className="gift-grid">
          {giftOptions.map((gift) => (
            <article className="gift-card" key={gift.amount}>
              <div className="gift-amount">{gift.amount}</div>
              <h3>{gift.title}</h3>
              <p>{gift.description}</p>
            </article>
          ))}
        </div>
        <Link className="btn primary donor-inline-cta" to="/donate">
          Choose a gift amount
        </Link>
      </section>

      <section className="donor-story card">
        <div className="story-photo">
          <img src="/photos/counseling-support.jpg" alt="Trauma-informed care conversation supported by donations." />
        </div>
        <div className="story-copy">
          <div className="sub-kicker">Anonymized impact story</div>
          <h2 className="section-title">A safer beginning can start with one gift.</h2>
          <p className="muted">
            When a survivor reaches a safehouse, support has to arrive quickly: a stable place to stay, a case worker
            who can follow up, counseling documentation, health and education check-ins, and careful planning for what
            comes next. Donor support helps make that care possible while protecting every survivor's privacy.
          </p>
          <Link className="btn" to="/impact">
            View public impact data
          </Link>
        </div>
      </section>

      <section className="card donor-section">
        <div className="section-intro">
          <div className="sub-kicker">Why donors can trust the work</div>
          <h2 className="section-title">Transparent enough for donors. Private enough for survivors.</h2>
        </div>
        <div className="trust-grid">
          {trustItems.map((item) => (
            <div className="trust-card" key={item}>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="impact-preview card">
        <div>
          <div className="sub-kicker">Impact dashboard preview</div>
          <h2 className="section-title">See how support creates change.</h2>
          <p className="muted">
            See how support is helping across shelter, counseling, education, wellbeing, and reintegration care without
            showing private survivor information.
          </p>
          <Link className="btn" to="/impact">
            Explore the dashboard
          </Link>
        </div>
        <div className="allocation-preview" aria-label="Resource allocation preview">
          <div className="allocation-row">
            <span>Shelter and safety</span>
            <div><i style={{ width: "82%" }} /></div>
            <strong>82%</strong>
          </div>
          <div className="allocation-row">
            <span>Counseling and wellbeing</span>
            <div><i style={{ width: "68%" }} /></div>
            <strong>68%</strong>
          </div>
          <div className="allocation-row">
            <span>Education support</span>
            <div><i style={{ width: "54%" }} /></div>
            <strong>54%</strong>
          </div>
          <div className="allocation-row">
            <span>Reintegration planning</span>
            <div><i style={{ width: "47%" }} /></div>
            <strong>47%</strong>
          </div>
        </div>
      </section>

      <section className="card donor-section">
        <div className="section-intro">
          <div className="sub-kicker">Ways to help</div>
          <h2 className="section-title">Choose the kind of support you can give today.</h2>
        </div>
        <div className="ways-grid">
          <article className="way-card featured">
            <h3>Give once</h3>
            <p>Make an immediate gift to support urgent care needs and safehouse operations.</p>
            <Link className="btn primary donor-primary-cta" to="/donate">
              Donate now
            </Link>
          </article>
          <article className="way-card">
            <h3>Become a donor</h3>
            <p>Create a donor account to give again and stay connected to public updates about the work.</p>
            <Link className="btn" to="/register">
              Create donor account
            </Link>
          </article>
          <article className="way-card">
            <h3>Offer time or skills</h3>
            <p>Support the mission through volunteer time, professional skills, or advocacy.</p>
            <Link className="btn" to="/contact">
              Contact us
            </Link>
          </article>
        </div>
      </section>

      <section className="cta-ribbon donor-final-cta">
        <div className="sub-kicker">Stand with survivors today</div>
        <h2>Your donation can help turn fear into safety and recovery into possibility.</h2>
        <Link className="btn primary donor-primary-cta" to="/donate">
          Donate now
        </Link>
      </section>
    </div>
  );
}
