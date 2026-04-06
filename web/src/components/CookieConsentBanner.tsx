import React, { useMemo, useState } from "react";
import { getCookie, setCookie } from "../lib/cookies";

type Consent = "accepted" | "rejected";
const COOKIE_NAME = "cookie_consent";

export function CookieConsentBanner() {
  const existing = useMemo(() => getCookie(COOKIE_NAME) as Consent | null, []);
  const [visible, setVisible] = useState(existing === null);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="card"
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: 16,
        maxWidth: 1100,
        margin: "0 auto",
      }}
    >
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontWeight: 700 }}>Cookie consent</div>
          <div className="muted" style={{ marginTop: 6 }}>
            We use essential cookies to run the site, plus optional cookies for preferences (like theme).
          </div>
        </div>
        <div className="row">
          <button
            className="btn"
            onClick={() => {
              setCookie(COOKIE_NAME, "rejected", 180);
              setVisible(false);
            }}
          >
            Reject
          </button>
          <button
            className="btn primary"
            onClick={() => {
              setCookie(COOKIE_NAME, "accepted", 180);
              setVisible(false);
            }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

