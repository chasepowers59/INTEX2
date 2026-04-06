import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function RequireAuth() {
  const auth = useAuth();
  const loc = useLocation();
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }
  return <Outlet />;
}

export function RequireRole(props: { role: string; children: React.ReactNode }) {
  const auth = useAuth();
  if (!auth.hasRole(props.role)) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Not authorized</h2>
        <p className="muted">You don’t have permission to access this area.</p>
      </div>
    );
  }
  return <>{props.children}</>;
}

