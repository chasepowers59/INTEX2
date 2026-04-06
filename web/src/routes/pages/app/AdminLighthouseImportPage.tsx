import React, { useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { RequireRole } from "../../guards";

export function AdminLighthouseImportPage() {
  const auth = useAuth();
  const [dir, setDir] = useState("");
  const [replace, setReplace] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <RequireRole role="Admin">
      <div className="card" style={{ maxWidth: 720 }}>
        <h1 style={{ marginTop: 0 }}>Lighthouse CSV → database</h1>
        <p className="muted">
          Loads INTEX CSV files from a folder on the <strong>API server</strong> into SQL (all case tables). Leave path empty to use{" "}
          <code>LighthouseImport:SourceDirectory</code> or repo <code>data/raw</code>. <strong>Replace</strong> wipes operational tables (not
          login accounts) then reloads.
        </p>
        {error ? (
          <div className="badge danger" style={{ marginTop: 10 }}>
            {error}
          </div>
        ) : null}
        <label style={{ display: "grid", gap: 6, marginTop: 12 }}>
          <span className="muted">Server folder (optional)</span>
          <input className="input" value={dir} onChange={(e) => setDir(e.target.value)} placeholder="e.g. C:\path\to\data\raw" />
        </label>
        <label className="row" style={{ marginTop: 10, gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
          <span>Replace existing operational data first</span>
        </label>
        <button
          className="btn primary"
          style={{ marginTop: 14 }}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            setLog([]);
            try {
              const res = await apiFetch<{ log: string[] }>("/api/admin/lighthouse-import", {
                method: "POST",
                token: auth.token ?? undefined,
                body: JSON.stringify({ sourceDirectory: dir.trim() || null, replace }),
              });
              setLog(res.log ?? []);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Importing…" : "Run import"}
        </button>
        {log.length ? (
          <pre className="muted" style={{ marginTop: 16, whiteSpace: "pre-wrap", fontSize: 12 }}>
            {log.join("\n")}
          </pre>
        ) : null}
      </div>
    </RequireRole>
  );
}
