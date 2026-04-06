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
  useEffect(() => {
    applyThemeFromCookie();
  }, []);

  return (
    <>
      <header
        className="container"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}
      >
        <Link to="/" style={{ fontWeight: 800 }}>
          Steps of Hope Leadership Portal
        </Link>
        <nav className="row">
          <Link className="btn" to="/give">
            Give
          </Link>
          <Link className="btn" to="/impact">
            Impact
          </Link>
          <Link className="btn primary" to="/login">
            Sign in
          </Link>
        </nav>
      </header>

      <main className="container">
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

        <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          Roles: {auth.roles.join(", ") || "—"}
        </div>
      </aside>

      <main className="content">
        <Outlet />
        <CookieConsentBanner />
      </main>
    </div>
  );
}
