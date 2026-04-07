import React, { useEffect } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Footer } from "../components/Footer";
import { CookieConsentBanner } from "../components/CookieConsentBanner";
import { useAuth } from "../lib/auth";
import { getCookie, setCookie } from "../lib/cookies";

const THEME_COOKIE = "ui_theme";

function applyThemeFromCookie() {
  const theme = getCookie(THEME_COOKIE);
  if (theme === "light" || theme === "dark") {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export function PublicLayout() {
  const auth = useAuth();

  useEffect(() => {
    applyThemeFromCookie();
  }, []);

  const staff = auth.hasRole("Admin") || auth.hasRole("Employee");
  const portalTo =
    staff ? "/app/dashboard" : auth.hasRole("Donor") ? "/app/donor" : "/app/dashboard";

  return (
    <>
      <div className="public-top-strip">
        <div className="container public-top-strip-inner muted">
          <span>South Korea Victim Support Line: +82 02-555-0147</span>
          <span>Email: support@stepsofhope.org · Donor Relations: donors@stepsofhope.org</span>
        </div>
      </div>
      <header className="public-header">
        <div className="container public-header-inner">
          <Link to="/" className="public-brand">
            <span className="public-brand-mark" aria-hidden>
              <svg viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="24" fill="url(#lg)" />
                <path d="M13 30h22M17 30V19l7-5 7 5v11M21 30V24h6v6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <linearGradient id="lg" x1="6" y1="6" x2="42" y2="42">
                    <stop stopColor="#2dd4bf" />
                    <stop offset="1" stopColor="#7c6cff" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
            <span className="public-brand-text">
              <span className="public-brand-title">Steps of Hope</span>
              <span className="public-brand-sub">Support for South Korean victims · donor and leadership portal</span>
              <span className="public-slogan">Safety · Healing · Justice · Empowerment</span>
            </span>
          </Link>
          <nav className="nav-pills" aria-label="Primary">
            <Link className="nav-pill" to="/">
              Home
            </Link>
            <Link className="nav-pill" to="/about">
              About
            </Link>
            <Link className="nav-pill" to="/contact">
              Contact
            </Link>
            <Link className="nav-pill" to="/roles">
              Roles
            </Link>
            <div className="nav-dropdown">
              <span className="nav-pill">Programs</span>
              <div className="nav-dropdown-menu" role="menu" aria-label="Programs">
                <Link className="nav-dropdown-item" to="/impact">
                  Survivor safety and shelter
                </Link>
                <Link className="nav-dropdown-item" to="/impact">
                  Healing and reintegration
                </Link>
                <Link className="nav-dropdown-item" to="/app/ml">
                  Predictive prevention insights
                </Link>
                <Link className="nav-dropdown-item" to="/give">
                  Donor funding pathways
                </Link>
              </div>
            </div>
            <Link className="nav-pill" to="/impact">
              Impact
            </Link>
            <Link className="nav-pill nav-pill-accent" to="/give">
              Give
            </Link>
            {auth.isAuthenticated ? (
              <Link className="nav-pill nav-pill-primary" to={portalTo}>
                My portal
              </Link>
            ) : (
              <>
                <Link className="nav-pill nav-pill-glow" to="/register">
                  Join as donor
                </Link>
                <Link className="nav-pill nav-pill-primary" to="/login">
                  Sign in
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="container public-main">
        <div className="mission-banner">
          Your support helps South Korean victims access safe shelter, case follow-up, and recovery pathways.
        </div>
        <Outlet />
      </main>

      <Footer />
      <CookieConsentBanner />
    </>
  );
}

export function AppLayout() {
  const auth = useAuth();

  useEffect(() => {
    applyThemeFromCookie();
    void auth.refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTheme = () => {
    const current = getCookie(THEME_COOKIE) === "light" ? "light" : "dark";
    const next = current === "light" ? "dark" : "light";
    setCookie(THEME_COOKIE, next, 180);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="title">Steps of Hope</div>
          <div className="muted" style={{ fontSize: 12 }}>
            Signed in as {auth.displayName ?? auth.username}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Mission focus: South Korean victim support
          </div>
        </div>

        {auth.hasRole("Admin") || auth.hasRole("Employee") ? (
          <>
            <div className="sidebar-section-label">Operations</div>
            <nav className="nav">
              <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/app/dashboard">
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M4 13.5V20a1 1 0 0 0 1 1h5v-6.5H4Z" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M14 21h5a1 1 0 0 0 1-1v-9l-8-6-8 6v2.5h6V21h4Z" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                Dashboard
              </NavLink>

              <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/app/cases">
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 4h10a2 2 0 0 1 2 2v14H5V6a2 2 0 0 1 2-2Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path d="M8 9h8M8 13h8M8 17h6" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                Caseload
              </NavLink>

              <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/app/donors">
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 21s7-4.35 7-10a4 4 0 0 0-7-2.4A4 4 0 0 0 5 11c0 5.65 7 10 7 10Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                </svg>
                Donors
              </NavLink>

              <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/app/reports">
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M4 19V5a1 1 0 0 1 1-1h14v16H5a1 1 0 0 1-1-1Z" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M8 16v-5M12 16V8M16 16v-3" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                Analytics
              </NavLink>
            </nav>

            <div className="sidebar-section-label">Machine Learning</div>
            <nav className="nav">
              <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/app/social-media">
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M4 12h16M12 4v16" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                Social strategy
              </NavLink>
              <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/app/action-center">
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3 3 7v6c0 5 3.8 8.8 9 10 5.2-1.2 9-5 9-10V7l-9-4Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path d="M9.5 12.5 11 14l3.5-4" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                Action Center
              </NavLink>
              <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/app/ml">
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M4 16V8M8 18V6M12 20V4M16 18V6M20 16V8" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                ML Insights
              </NavLink>
            </nav>
          </>
        ) : null}

        {auth.hasRole("Admin") ? (
          <>
            <div className="sidebar-section-label">Admin</div>
            <nav className="nav">
              <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/app/admin/users">
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M4 21a8 8 0 0 1 16 0"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                Users
              </NavLink>
              <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/app/admin/allocations">
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 4h10a2 2 0 0 1 2 2v14H5V6a2 2 0 0 1 2-2Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path d="M8 9h8M8 13h8M8 17h6" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                Allocations
              </NavLink>
              <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/app/admin/lighthouse-import">
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3v12M8 11l4 4 4-4" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M5 21h14" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                CSV import
              </NavLink>
            </nav>
          </>
        ) : null}

        {auth.hasRole("Donor") ? (
          <>
            <div className="sidebar-section-label">Donor</div>
            <nav className="nav">
              <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/app/donor">
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 14a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M4 21a8 8 0 0 1 16 0"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                My Impact
              </NavLink>
            </nav>
          </>
        ) : null}

        <div style={{ marginTop: 14 }} className="row">
          <button className="btn" onClick={toggleTheme}>
            Toggle theme
          </button>
          <button className="btn" onClick={auth.logout}>
            Sign out
          </button>
        </div>

        <div className="role-chips" style={{ marginTop: 12 }} aria-label="Your roles">
          {auth.roles.length > 0 ? (
            auth.roles.map((r) => (
              <span key={r} className={`role-chip role-chip--${r.toLowerCase()}`}>
                {r}
              </span>
            ))
          ) : auth.token ? (
            <span className="muted" style={{ fontSize: 12 }}>
              Loading roles…
            </span>
          ) : (
            <span className="muted" style={{ fontSize: 12 }}>
              —
            </span>
          )}
        </div>
      </aside>

      <main className="content">
        <Outlet />
        <CookieConsentBanner />
      </main>
    </div>
  );
}
