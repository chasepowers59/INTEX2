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
          <span>Safe support for survivors in South Korea.</span>
        </div>

        <div className="public-footer-meta">
          <div className="public-footer-links" aria-label="Footer links">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/contact">Contact</Link>
            <a href="mailto:support@stepsofhope.org">Email us</a>
            <span>South Korea support hotline: 1366</span>
          </div>
          {onToggleTheme ? (
            <button className="btn footer-theme-btn" type="button" onClick={onToggleTheme}>
              Toggle theme
            </button>
          ) : null}
        </div>

        <div className="public-footer-copy">© {new Date().getFullYear()} Steps of Hope</div>
      </div>
    </footer>
  );
}
