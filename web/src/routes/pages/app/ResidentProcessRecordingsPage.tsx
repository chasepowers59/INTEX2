import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { PaginationControls } from "../../../components/ui/PaginationControls";

type Recording = {
  processRecordingId: number;
  residentId: number;
  sessionDate: string;
  socialWorkerName: string;
  sessionType: string;
  sessionDurationMinutes: number | null;
  emotionalStateObserved: string | null;
  emotionalStateEnd: string | null;
  narrativeSummary: string;
  interventionsApplied: string | null;
  followUpActions: string | null;
  progressNoted: boolean;
  concernsFlagged: boolean;
  referralMade: boolean;
  notesRestricted: string | null;
};

type Paged<T> = { page: number; pageSize: number; total: number; items: T[] };
const highRiskWords = ["fear", "relapse", "danger", "unsafe", "threat", "abuse", "violence", "self-harm"];

export function ResidentProcessRecordingsPage() {
  const auth = useAuth();
  const PAGE_SIZE = 10;
  const params = useParams();
  const residentId = Number(params.residentId);
  const [data, setData] = useState<Paged<Recording> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSummary, setEditSummary] = useState("");
  const [showRecordingForm, setShowRecordingForm] = useState(false);
  const [form, setForm] = useState({
    sessionDate: new Date().toISOString().slice(0, 10),
    socialWorkerName: "",
    sessionType: "Individual",
    emotionalStateObserved: "",
    narrativeSummary: "",
    interventionsApplied: "",
    followUpActions: "",
    sessionDurationMinutes: "",
    emotionalStateEnd: "",
    progressNoted: false,
    concernsFlagged: false,
    referralMade: false,
    notesRestricted: "",
  });
  const keywordHits = highRiskWords.filter((word) => form.narrativeSummary.toLowerCase().includes(word));

  const load = async () => {
    setError(null);
    const res = await apiFetch<Paged<Recording>>(`/api/process-recordings?residentId=${residentId}`, {
      token: auth.token ?? undefined,
    });
    setData(res);
  };

  useEffect(() => {
    if (!Number.isFinite(residentId)) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residentId]);

  const totalPages = Math.max(1, Math.ceil((data?.items.length ?? 0) / PAGE_SIZE));
  const rows = (data?.items ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="process-page">
      <div className="card">
        <div className="process-header">
          <div>
            <h1 style={{ marginTop: 0 }}>Process Recording</h1>
            <p className="muted">Session notes, interventions, and follow-up actions.</p>
          </div>
          <button className="btn primary" onClick={() => setShowRecordingForm((open) => !open)}>
            {showRecordingForm ? "Cancel" : "Add recording"}
          </button>
        </div>

        <div className={`process-collapsible ${showRecordingForm ? "open" : ""}`} aria-hidden={!showRecordingForm}>
          <div className="card process-form-card" role="region" aria-labelledby="process-recording-title">
            <div className="process-header process-inline-header">
              <div>
                <strong id="process-recording-title">Add recording</strong>
              </div>
            </div>

            <div className="process-form-section">
              <div className="process-section-head">
                <strong>Session details</strong>
              </div>
              <div className="process-grid process-grid--meta">
                <label className="process-field">
                  <span className="muted">Session date</span>
                  <input
                    className="input"
                    type="date"
                    value={form.sessionDate}
                    onChange={(e) => setForm((p) => ({ ...p, sessionDate: e.target.value }))}
                  />
                </label>

                <label className="process-field process-field--wide">
                  <span className="muted">Social worker</span>
                  <input
                    className="input"
                    value={form.socialWorkerName}
                    onChange={(e) => setForm((p) => ({ ...p, socialWorkerName: e.target.value }))}
                    placeholder={auth.displayName ?? "Name"}
                  />
                </label>

                <label className="process-field">
                  <span className="muted">Session type</span>
                  <select
                    className="input"
                    value={form.sessionType}
                    onChange={(e) => setForm((p) => ({ ...p, sessionType: e.target.value }))}
                  >
                    <option value="Individual">Individual</option>
                    <option value="Group">Group</option>
                  </select>
                </label>

                <label className="process-field">
                  <span className="muted">Duration (minutes)</span>
                  <input
                    className="input"
                    value={form.sessionDurationMinutes}
                    onChange={(e) => setForm((p) => ({ ...p, sessionDurationMinutes: e.target.value }))}
                  />
                </label>
              </div>
            </div>

            <div className="process-form-section">
              <div className="process-section-head">
                <strong>Observations</strong>
              </div>
              <div className="process-grid">
                <label className="process-field">
                  <span className="muted">Emotional state observed</span>
                  <input
                    className="input"
                    value={form.emotionalStateObserved}
                    onChange={(e) => setForm((p) => ({ ...p, emotionalStateObserved: e.target.value }))}
                    placeholder="e.g., anxious, withdrawn, hopeful"
                  />
                </label>

                <label className="process-field">
                  <span className="muted">Emotional state at end</span>
                  <input
                    className="input"
                    value={form.emotionalStateEnd}
                    onChange={(e) => setForm((p) => ({ ...p, emotionalStateEnd: e.target.value }))}
                  />
                </label>
              </div>

              <label className="process-field process-field--full">
                <span className="muted">Narrative summary</span>
                <textarea
                  className="input process-textarea-main"
                  rows={6}
                  value={form.narrativeSummary}
                  onChange={(e) => setForm((p) => ({ ...p, narrativeSummary: e.target.value }))}
                  placeholder="What happened in the session?"
                />
              </label>
              {keywordHits.length ? (
                <div className="row process-risk-keywords" style={{ marginTop: 8 }}>
                  <span className="badge warn">Risk keywords</span>
                  {keywordHits.map((word) => (
                    <span key={word} className="badge danger">
                      {word}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="process-form-section">
              <div className="process-section-head">
                <strong>Interventions and follow-up</strong>
              </div>
              <div className="process-grid">
                <label className="process-field">
                  <span className="muted">Interventions applied</span>
                  <input
                    className="input"
                    value={form.interventionsApplied}
                    onChange={(e) => setForm((p) => ({ ...p, interventionsApplied: e.target.value }))}
                  />
                </label>
                <label className="process-field">
                  <span className="muted">Follow-up actions</span>
                  <input
                    className="input"
                    value={form.followUpActions}
                    onChange={(e) => setForm((p) => ({ ...p, followUpActions: e.target.value }))}
                  />
                </label>
              </div>
            </div>

            <div className="process-form-section">
              <div className="process-section-head">
                <strong>Flags and restricted notes</strong>
              </div>
              <div className="process-flag-strip">
                <label className="row"><input type="checkbox" checked={form.progressNoted} onChange={(e) => setForm((p) => ({ ...p, progressNoted: e.target.checked }))} /> Progress noted</label>
                <label className="row"><input type="checkbox" checked={form.concernsFlagged} onChange={(e) => setForm((p) => ({ ...p, concernsFlagged: e.target.checked }))} /> Concerns flagged</label>
                <label className="row"><input type="checkbox" checked={form.referralMade} onChange={(e) => setForm((p) => ({ ...p, referralMade: e.target.checked }))} /> Referral made</label>
              </div>

              <label className="process-field process-field--full">
                <span className="muted">Restricted notes</span>
                <input
                  className="input"
                  value={form.notesRestricted}
                  onChange={(e) => setForm((p) => ({ ...p, notesRestricted: e.target.value }))}
                />
              </label>
            </div>

            <div className="row process-form-actions" style={{ marginTop: 12, justifyContent: "flex-end" }}>
              {error ? <div className="badge danger">{error}</div> : null}
              <button className="btn ghost" onClick={() => setShowRecordingForm(false)}>
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={async () => {
                  setError(null);
                  if (!form.narrativeSummary.trim()) {
                    setError("Narrative summary is required.");
                    return;
                  }
                  try {
                    await apiFetch<void>("/api/process-recordings", {
                      method: "POST",
                      token: auth.token ?? undefined,
                      body: JSON.stringify({
                        residentId,
                        sessionDate: form.sessionDate,
                        socialWorkerName: form.socialWorkerName.trim() || auth.displayName || "Staff",
                        sessionType: form.sessionType,
                        emotionalStateObserved: form.emotionalStateObserved.trim() || null,
                        emotionalStateEnd: form.emotionalStateEnd.trim() || null,
                        narrativeSummary: form.narrativeSummary.trim(),
                        interventionsApplied: form.interventionsApplied.trim() || null,
                        followUpActions: form.followUpActions.trim() || null,
                        sessionDurationMinutes: form.sessionDurationMinutes.trim() ? Number(form.sessionDurationMinutes) : null,
                        progressNoted: form.progressNoted,
                        concernsFlagged: form.concernsFlagged,
                        referralMade: form.referralMade,
                        notesRestricted: form.notesRestricted.trim() || null,
                      }),
                    });
                    setForm((p) => ({
                      ...p,
                      narrativeSummary: "",
                      emotionalStateObserved: "",
                      emotionalStateEnd: "",
                      interventionsApplied: "",
                      followUpActions: "",
                      notesRestricted: "",
                    }));
                    await load();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Add recording
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Worker</th>
                <th>Type</th>
                <th>Summary</th>
                <th style={{ width: 220 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.processRecordingId}>
                  <td data-label="Date">{row.sessionDate}</td>
                  <td data-label="Worker" className="muted">
                    {row.socialWorkerName}
                  </td>
                  <td data-label="Type">
                    <span className="badge">{row.sessionType}</span>
                  </td>
                  <td data-label="Summary" className="muted">
                    {row.narrativeSummary}
                  </td>
                  <td data-label="Actions">
                    <div className="row">
                      <button
                        className="btn"
                        onClick={() => {
                          setEditingId(row.processRecordingId);
                          setEditSummary(row.narrativeSummary);
                        }}
                      >
                        Edit summary
                      </button>
                      {auth.hasRole("Admin") ? (
                        <button
                          className="btn danger"
                          onClick={async () => {
                            if (!confirm("Delete this recording?")) return;
                            try {
                              await apiFetch<void>(`/api/process-recordings/${row.processRecordingId}?confirm=true`, {
                                method: "DELETE",
                                token: auth.token ?? undefined,
                              });
                              await load();
                            } catch (e) {
                              setError((e as Error).message);
                            }
                          }}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {editingId !== null ? (
                <tr>
                  <td className="muted">Editing</td>
                  <td className="muted">-</td>
                  <td className="muted">-</td>
                  <td>
                    <input className="input" value={editSummary} onChange={(e) => setEditSummary(e.target.value)} />
                  </td>
                  <td>
                    <div className="row">
                      <button
                        className="btn primary"
                        onClick={async () => {
                          const original = data?.items.find((record) => record.processRecordingId === editingId);
                          if (!original) return;
                          try {
                            await apiFetch<void>(`/api/process-recordings/${editingId}`, {
                              method: "PUT",
                              token: auth.token ?? undefined,
                              body: JSON.stringify({ ...original, narrativeSummary: editSummary }),
                            });
                            setEditingId(null);
                            await load();
                          } catch (e) {
                            setError((e as Error).message);
                          }
                        }}
                      >
                        Save
                      </button>
                      <button className="btn" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ) : null}
              {data && rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    No process recordings yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      </div>
    </div>
  );
}
