import React, { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/api";

const contactCards = [
  {
    title: "General questions",
    detail: "support@stepsofhope.org",
    description: "For mission questions, public information, and general support.",
  },
  {
    title: "Donor relations",
    detail: "donors@stepsofhope.org",
    description: "For giving questions, donor accounts, and allocation transparency.",
  },
  {
    title: "Program partnerships",
    detail: "partnerships@stepsofhope.org",
    description: "For safehouse, social service, and community partnership conversations.",
  },
  {
    title: "Support line",
    detail: "+82 02-555-0147",
    description: "For public routing and non-emergency support inquiries in South Korea.",
  },
];

const inquiryTypes = ["Donate", "Volunteer", "Partner", "Media", "General question"];

type ContactResponse = {
  message: string;
  referenceId: string;
};

export function ContactPage() {
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const inquiryType = String(data.get("inquiryType") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    setSubmitting(true);
    setStatus(null);
    try {
      const res = await apiFetch<ContactResponse>("/api/public/contact", {
        method: "POST",
        body: JSON.stringify({ name, email, inquiryType, message }),
      });
      setStatus({
        type: "success",
        message: `${res.message} Reference: ${res.referenceId}`,
      });
      form.reset();
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Unable to send your message right now.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      <section className="contact-hero card">
        <div>
          <div className="sub-kicker">Contact Steps of Hope</div>
          <h1>Have a question, want to help, or need the right next contact?</h1>
          <p className="muted">
            We welcome messages from donors, partners, volunteers, and community members who want to support survivor
            safety and recovery. Please do not include identifying survivor details in public contact messages.
          </p>
          <div className="donor-hero-actions">
            <a className="btn primary donor-primary-cta" href="mailto:support@stepsofhope.org">
              Contact us
            </a>
            <Link className="btn" to="/impact">
              See impact
            </Link>
          </div>
        </div>
        <div className="contact-hero-card">
          <div className="sub-kicker">Response promise</div>
          <p>
            We route donor, volunteer, and partner inquiries to the right team while keeping sensitive case information
            out of public channels.
          </p>
        </div>
      </section>

      <section className="contact-card-grid" aria-label="Contact options">
        {contactCards.map((card) => (
          <article className="contact-card" key={card.title}>
            <h2>{card.title}</h2>
            <strong>{card.detail}</strong>
            <p>{card.description}</p>
          </article>
        ))}
      </section>

      <section className="contact-split card">
        <div>
          <div className="sub-kicker">Send a message</div>
          <h2 className="section-title">Tell us how we can help.</h2>
          <p className="muted">
            Use this form for donor, volunteer, partner, media, or general questions. Please do not include identifying
            survivor, medical, legal, or family details unless you are already working with an authorized staff member
            through a secure channel.
          </p>
        </div>
        <form className="contact-form" onSubmit={handleSubmit}>
          <label>
            Your name
            <input name="name" type="text" autoComplete="name" required />
          </label>
          <label>
            Email address
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Inquiry type
            <select name="inquiryType" defaultValue="General question" required>
              {inquiryTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Message
            <textarea name="message" rows={5} required />
          </label>
          <button className="btn primary" type="submit">
            {submitting ? "Sending..." : "Send message"}
          </button>
          {status ? (
            <div className={`contact-form-status contact-form-status--${status.type}`} role="status">
              {status.message}
            </div>
          ) : null}
        </form>
      </section>

      <section className="ways-grid">
        <article className="way-card featured">
          <h3>Ready to support care now?</h3>
          <p>Make a gift that helps fund safe shelter, counseling support, and reintegration planning.</p>
          <Link className="btn primary" to="/give">
            Donate now
          </Link>
        </article>
        <article className="way-card">
          <h3>Want to stay connected?</h3>
          <p>Create a donor account to give again and view anonymized impact summaries over time.</p>
          <Link className="btn" to="/register">
            Create donor account
          </Link>
        </article>
        <article className="way-card">
          <h3>Need to understand the work first?</h3>
          <p>See how donor support connects to public, aggregate impact across care programs.</p>
          <Link className="btn" to="/impact">
            View impact dashboard
          </Link>
        </article>
      </section>
    </div>
  );
}
