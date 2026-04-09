import React from "react";
import { Link } from "react-router-dom";

type FooterProps = {
  onToggleTheme?: () => void;
};

export function Footer({ onToggleTheme }: FooterProps) {
  return (
    <footer className="public-footer">
      <div className="container public-footer-inner">
        <div className="public-footer-brand">
          <strong>Steps of Hope</strong>
          <span>Serving South Korean survivors through trauma-informed, privacy-first support.</span>
        </div>

        <div className="public-footer-links" aria-label="Footer links">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/contact">Contact</Link>
          <span>Support Line: +82 02-555-0147</span>
          <span>Email: support@stepsofhope.org</span>
          <span>Donor Relations: donors@stepsofhope.org</span>
          {onToggleTheme ? (
            <button className="theme-toggle-link" type="button" onClick={onToggleTheme}>
              Toggle theme
            </button>
          ) : null}
        </div>

        <div className="public-footer-copy">© {new Date().getFullYear()} Steps of Hope</div>
      </div>
    </footer>
  );
}
