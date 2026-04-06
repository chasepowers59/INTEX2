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
          Sanctuary Leadership Portal
        </Link>
        <nav className="row">
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
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Staff Portal</div>
        <div className="muted" style={{ marginBottom: 12 }}>
          Signed in as {auth.displayName ?? auth.username}
        </div>

        <nav style={{ display: "grid", gap: 8 }}>
          <NavLink className="btn" to="/app/dashboard">
            Dashboard
          </NavLink>
          <NavLink className="btn" to="/app/donors">
            Donors & Contributions
          </NavLink>
          <NavLink className="btn" to="/app/cases">
            Caseload Inventory
          </NavLink>
          <NavLink className="btn" to="/app/reports">
            Reports & Analytics
          </NavLink>
        </nav>

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
