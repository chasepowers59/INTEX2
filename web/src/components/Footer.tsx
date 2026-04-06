import React from "react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="container" style={{ paddingTop: 8, paddingBottom: 28 }}>
      <div className="muted" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <span>© {new Date().getFullYear()} Steps of Hope Leadership Portal</span>
        <span aria-hidden="true">•</span>
        <Link to="/privacy">Privacy Policy</Link>
      </div>
    </footer>
  );
}
