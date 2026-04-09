import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Footer } from "../components/Footer";
import { CookieConsentBanner } from "../components/CookieConsentBanner";
import { useAuth } from "../lib/auth";
import { getCookie, setCookie } from "../lib/cookies";

const THEME_COOKIE = "ui_theme";
const CONSENT_COOKIE = "cookie_consent";

function getActiveTheme() {
  const theme = getCookie(THEME_COOKIE);
  if (theme === "light" || theme === "dark") {
    return theme;
  }
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function applyThemeFromCookie() {
  const theme = getCookie(THEME_COOKIE);
  document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function PublicLayout() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    applyThemeFromCookie();
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    if (!(auth.hasRole("Admin") || auth.hasRole("Employee"))) return;
    if (location.pathname !== "/") return;
    navigate("/app/dashboard", { replace: true });
  }, [auth, location.pathname, navigate]);

  useEffect(() => {
    if (!menuOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [menuOpen]);

  const staff = auth.hasRole("Admin") || auth.hasRole("Employee");
  const portalTo =
    staff ? "/app/dashboard" : auth.hasRole("Donor") ? "/app/donor" : "/app/dashboard";
  const toggleTheme = () => {
    const current = getActiveTheme();
    const next = current === "light" ? "dark" : "light";
    if (getCookie(CONSENT_COOKIE) === "accepted") {
      setCookie(THEME_COOKIE, next, 180);
    }
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <div className="public-shell">
      <header className="public-header">
        <div className="container public-header-inner">
          <Link to="/" className="public-brand">
            <span className="public-brand-mark" aria-hidden>
              <img className="public-brand-logo" src="/logo-icon.png" alt="" />
            </span>
            <span className="public-brand-text">
              <span className="public-brand-title">Steps of Hope</span>
              <span className="public-brand-sub">Survivor support nonprofit</span>
            </span>
          </Link>

          <button
            className="mobile-menu-toggle public-mobile-menu-toggle"
            type="button"
            aria-label={menuOpen ? "Close site menu" : "Open site menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MenuIcon />
          </button>

          <div className={`public-nav-shell ${menuOpen ? "open" : ""}`}>
            <nav className="nav-pills" aria-label="Primary">
              <Link className="nav-pill" to="/">
                Home
              </Link>
              <Link className="nav-pill" to="/programs">
                How We Help
              </Link>
              <Link className="nav-pill" to="/impact">
                Impact
              </Link>
              <Link className="nav-pill" to="/about">
                About
              </Link>
              <Link className="nav-pill" to="/contact">
                Contact
              </Link>
            </nav>

            <div className="nav-pill-actions" aria-label="Donation and account actions">
              {auth.isAuthenticated ? (
                <>
                  <Link className="nav-pill nav-pill-primary" to={portalTo}>
                    My portal
                  </Link>
                  <button
                    className="nav-pill nav-pill-outline-accent"
                    type="button"
                    onClick={() => auth.logout()}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link className="nav-pill nav-pill-glow" to="/donate">
                    Donate
                  </Link>
                  <Link className="nav-pill nav-pill-outline-accent" to="/login">
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
      {menuOpen ? <button className="mobile-drawer-backdrop" aria-label="Close site menu" onClick={() => setMenuOpen(false)} /> : null}

      <main className="container public-main">
        <Outlet />
      </main>

      <Footer onToggleTheme={toggleTheme} />
      <CookieConsentBanner />
    </div>
  );
}

export function AppLayout() {
  const auth = useAuth();
  const location = useLocation();
  const donorOnly = auth.hasRole("Donor") && !auth.hasRole("Admin") && !auth.hasRole("Employee");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    applyThemeFromCookie();
    void auth.refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [sidebarOpen]);

  const toggleTheme = () => {
    const current = getActiveTheme();
    const next = current === "light" ? "dark" : "light";
    if (getCookie(CONSENT_COOKIE) === "accepted") {
      setCookie(THEME_COOKIE, next, 180);
    }
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <div className={`layout ${donorOnly ? "layout-donor" : "layout-staff"}`}>
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="title">Steps of Hope</div>
          <div className="muted" style={{ fontSize: 12 }}>
            Signed in as {auth.displayName ?? auth.username}
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
            </nav>

            <div className="sidebar-section-label">Fundraising</div>
            <nav className="nav">
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
              {auth.hasRole("Admin") ? (
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
              ) : null}
              <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/app/social-media">
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M4 12h16M12 4v16" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                Social strategy
              </NavLink>
              <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/app/reports">
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M4 19V5a1 1 0 0 1 1-1h14v16H5a1 1 0 0 1-1-1Z" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M8 16v-5M12 16V8M16 16v-3" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                Analytics
              </NavLink>
            </nav>
          </>
        ) : null}

        {auth.hasRole("Admin") ? (
          <>
            <div className="sidebar-section-label">Partners</div>
            <nav className="nav">
              <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/app/admin/partners">
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M4 18h16M6 18V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M9 11h6M9 14h6" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                Partners
              </NavLink>
              <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/app/admin/partner-assignments">
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                Assignments
              </NavLink>
            </nav>

            <div className="sidebar-section-label">Settings</div>
            <nav className="nav">
              <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/app/admin/users">
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M4 21a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                Users
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
                  <path d="M12 14a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M4 21a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                My Impact
              </NavLink>
            </nav>
          </>
        ) : null}

        {auth.isAuthenticated ? (
          <>
            <div className="sidebar-section-label">Website</div>
            <nav className="nav">
              <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/app/donate">
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3v18M5 8h10a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h10" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                Donate
              </NavLink>
              <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/app/impact">
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M4 19V5a1 1 0 0 1 1-1h14v16H5a1 1 0 0 1-1-1Z" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M8 16v-5M12 16V8M16 16v-3" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                Impact
              </NavLink>
              <NavLink className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} to="/">
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M4 12h16M12 4l8 8-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Public site
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
              Loading roles...
            </span>
          ) : (
            <span className="muted" style={{ fontSize: 12 }}>
              -
            </span>
          )}
        </div>
      </aside>
      {sidebarOpen ? <button className="mobile-drawer-backdrop app-drawer-backdrop" aria-label="Close app menu" onClick={() => setSidebarOpen(false)} /> : null}

      <main className="content">
        <div className="app-mobile-bar">
          <button
            className="mobile-menu-toggle"
            type="button"
            aria-label={sidebarOpen ? "Close app menu" : "Open app menu"}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <MenuIcon />
          </button>
          <div className="app-mobile-title">Steps of Hope</div>
        </div>
        <Outlet />
        <CookieConsentBanner />
      </main>
    </div>
  );
}
