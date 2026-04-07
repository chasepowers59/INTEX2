import React from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function RequireAuth() {
  const auth = useAuth();
  const loc = useLocation();
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }
  return <Outlet />;
}

/** Donors (Donor role without Admin/Employee) cannot access staff CRM / ML routes. */
export function RequireStaff() {
  const auth = useAuth();
  const loc = useLocation();

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  if (auth.hasRole("Admin") || auth.hasRole("Employee")) {
    return <Outlet />;
  }

  if (auth.hasRole("Donor")) {
    return <Navigate to="/app/donor" replace />;
  }

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h2 style={{ marginTop: 0 }}>Staff access only</h2>
      <p className="muted">
        This area is for program staff and social workers. Supporters can create a{" "}
        <strong>donor account</strong> (free) to give and track personal impact—no resident data is ever exposed.
      </p>
      <div className="row" style={{ marginTop: 14 }}>
        <Link className="btn primary" to="/register">
          Create donor account
        </Link>
        <Link className="btn" to="/login">
          Sign in
        </Link>
        <Link className="btn" to="/impact">
          Public impact
        </Link>
      </div>
    </div>
  );
}

export function RequireRole(props: { role: string; children: React.ReactNode }) {
  const auth = useAuth();

  if (auth.hasRole(props.role)) {
    return <>{props.children}</>;
  }

  // Admin should be able to view normal donor-facing app pages.
  if (props.role === "Donor" && auth.hasRole("Admin")) {
    return <>{props.children}</>;
  }

  return (
    <div className="card glow-donor" style={{ maxWidth: 560 }}>
      <div className="badge donor-role-badge" style={{ marginBottom: 10 }}>
        Donor role required
      </div>
      <h2 style={{ marginTop: 0 }}>Different sign-in for this page</h2>
      <p className="muted">
        {props.role === "Donor" ? (
          <>
            Registration assigns the <strong>Donor</strong> role automatically so you can give safely and see{" "}
            <em>your</em> receipts and impact summaries—never resident-level records.
          </>
        ) : (
          <>You don’t have permission to view this area.</>
        )}
      </p>
      {props.role === "Donor" ? (
        <div className="row" style={{ marginTop: 14 }}>
          <Link className="btn primary" to="/register">
            Create donor account (about 1 minute)
          </Link>
          <Link className="btn" to="/login">
            Already registered? Sign in
          </Link>
        </div>
      ) : (
        <Link className="btn" to="/app/dashboard" style={{ marginTop: 14 }}>
          Back to app
        </Link>
      )}
    </div>
  );
}
