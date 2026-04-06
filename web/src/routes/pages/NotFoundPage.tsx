import React from "react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="card">
      <h1 style={{ marginTop: 0 }}>Page not found</h1>
      <p className="muted">That page doesn’t exist.</p>
      <Link className="btn primary" to="/">
        Go home
      </Link>
    </div>
  );
}

