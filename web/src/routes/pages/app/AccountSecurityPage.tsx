import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";

type MfaStatus = {
  enabled: boolean;
  hasSharedKey: boolean;
};

type MfaSetup = {
  enabled: boolean;
  sharedKey: string;
  manualEntryKey: string;
  otpauthUri: string;
};

export function AccountSecurityPage() {
  const auth = useAuth();
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [enableCode, setEnableCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const token = auth.token ?? undefined;

  const loadStatus = async () => {
    if (!token) return;
    const res = await apiFetch<MfaStatus>("/api/auth/mfa/status", { token });
    setStatus(res);
    if (res.enabled) {
      setSetup(null);
    }
  };

  useEffect(() => {
    void loadStatus().catch((e) => setError((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="admin-page account-security-page">
      <div className="card">
        <div className="admin-header-copy">
          <h1 style={{ marginTop: 0 }}>Account Security</h1>
          <p className="muted">Authenticator setup and MFA status.</p>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <span className={`badge ${status?.enabled ? "ok" : "warn"}`}>
            {status?.enabled ? "MFA enabled" : "MFA not enabled"}
          </span>
          <span className="badge">User: {auth.displayName ?? auth.username}</span>
        </div>
        {error ? (
          <div className="badge danger" style={{ marginTop: 12 }}>
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="badge ok" style={{ marginTop: 12 }}>
            {message}
          </div>
        ) : null}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Enable authenticator app</h2>
        <p className="muted">Generate a key, add it to your authenticator app, then verify with the current code.</p>
        <div className="row" style={{ marginTop: 12, alignItems: "end", flexWrap: "wrap" }}>
          <button
            className="btn primary"
            disabled={busy || status?.enabled === true}
            onClick={async () => {
              setBusy(true);
              setError(null);
              setMessage(null);
              try {
                const res = await apiFetch<MfaSetup>("/api/auth/mfa/setup", { method: "POST", token });
                setSetup(res);
                setStatus({ enabled: res.enabled, hasSharedKey: true });
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Generate authenticator key
          </button>
        </div>

        {setup ? (
          <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
            <div className="card tone-aqua" style={{ boxShadow: "none" }}>
              <div className="muted">Manual entry key</div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "0.08em" }}>{setup.manualEntryKey}</div>
            </div>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="muted">Authenticator URI</span>
              <textarea className="input" rows={3} readOnly value={setup.otpauthUri} />
            </label>
            <label style={{ display: "grid", gap: 6, maxWidth: 240 }}>
              <span className="muted">Verification code</span>
              <input
                className="input"
                value={enableCode}
                onChange={(e) => setEnableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder="123456"
              />
            </label>
            <button
              className="btn primary"
              disabled={busy || enableCode.length !== 6}
              onClick={async () => {
                setBusy(true);
                setError(null);
                setMessage(null);
                try {
                  await apiFetch<{ enabled: boolean; message: string }>("/api/auth/mfa/enable", {
                    method: "POST",
                    token,
                    body: JSON.stringify({ code: enableCode }),
                  });
                  setEnableCode("");
                  setSetup(null);
                  await loadStatus();
                  setMessage("Authenticator app verified. MFA is now active for this account.");
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Enable MFA
            </button>
          </div>
        ) : (
          <div className="muted" style={{ marginTop: 12 }}>
            {status?.enabled
              ? "This account already requires an authenticator code at sign-in."
              : "No authenticator key has been generated for this account yet."}
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Disable MFA</h2>
        <p className="muted">Current password and a live authenticator code are required.</p>
        <div className="row" style={{ marginTop: 12, flexWrap: "wrap" }}>
          <input
            className="input"
            style={{ flex: "1 1 240px" }}
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            placeholder="Current password"
          />
          <input
            className="input"
            style={{ flex: "0 0 180px" }}
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="123456"
          />
          <button
            className="btn"
            disabled={busy || !status?.enabled || disablePassword.length === 0 || disableCode.length !== 6}
            onClick={async () => {
              setBusy(true);
              setError(null);
              setMessage(null);
              try {
                await apiFetch<{ enabled: boolean; message: string }>("/api/auth/mfa/disable", {
                  method: "POST",
                  token,
                  body: JSON.stringify({ password: disablePassword, code: disableCode }),
                });
                setDisablePassword("");
                setDisableCode("");
                await loadStatus();
                setMessage("MFA disabled for this account.");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Disable MFA
          </button>
        </div>
      </div>
    </div>
  );
}
