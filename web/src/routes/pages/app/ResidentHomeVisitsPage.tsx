import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { RequireRole } from "../../guards";
import { PaginationControls } from "../../../components/ui/PaginationControls";

type Visit = {
  homeVisitationId: number;
  residentId: number;
  visitDate: string;
  socialWorkerName: string | null;
  visitType: string;
  locationVisited: string | null;
  familyMembersPresent: string | null;
  purpose: string | null;
  observations: string | null;
  familyCooperationLevel: string | null;
  safetyConcernsNoted: boolean;
  followUpNeeded: boolean;
  followUpNotes: string | null;
  visitOutcome: string | null;
  safetyConcerns: string | null;
  followUpActions: string | null;
};

type Conference = {
  caseConferenceId: number;
  residentId: number;
  scheduledAtUtc: string;
  topic: string | null;
  notes: string | null;
  isCompleted: boolean;
};

type Paged<T> = { page: number; pageSize: number; total: number; items: T[] };

export function ResidentHomeVisitsPage() {
  const auth = useAuth();
  const PAGE_SIZE = 10;
  const params = useParams();
  const residentId = Number(params.residentId);
  const [data, setData] = useState<Paged<Visit> | null>(null);
  const [confs, setConfs] = useState<Paged<Conference> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visitPage, setVisitPage] = useState(1);
  const [confPage, setConfPage] = useState(1);
  const [conferenceForm, setConferenceForm] = useState({
    scheduledAtUtc: "",
    topic: "",
    notes: "",
  });
  const [visitForm, setVisitForm] = useState({
    visitDate: new Date().toISOString().slice(0, 10),
    visitType: "RoutineFollowUp",
    socialWorkerName: "",
    locationVisited: "",
    familyMembersPresent: "",
    purpose: "",
    observations: "",
    familyCooperationLevel: "",
    safetyConcernsNoted: false,
    followUpNeeded: false,
    followUpNotes: "",
    visitOutcome: "",
    safetyConcerns: "",
    followUpActions: "",
  });

  const load = async () => {
    setError(null);
    const res = await apiFetch<Paged<Visit>>(`/api/home-visitations?residentId=${residentId}`, { token: auth.token ?? undefined });
    setData(res);
    const conf = await apiFetch<Paged<Conference>>(`/api/case-conferences?residentId=${residentId}&upcomingOnly=false`, {
      token: auth.token ?? undefined,
    });
    setConfs(conf);
  };

  useEffect(() => {
    if (!Number.isFinite(residentId)) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residentId]);

  const visitTotalPages = Math.max(1, Math.ceil((data?.items.length ?? 0) / PAGE_SIZE));
  const visitRows = (data?.items ?? []).slice((visitPage - 1) * PAGE_SIZE, visitPage * PAGE_SIZE);
  const confTotalPages = Math.max(1, Math.ceil((confs?.items.length ?? 0) / PAGE_SIZE));
  const confRows = (confs?.items ?? []).slice((confPage - 1) * PAGE_SIZE, confPage * PAGE_SIZE);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Home Visitation & Case Conferences</h1>
        <p className="muted">
          Log home/field visits and track follow-ups. Case conferences are visible on the dashboard (and will be expanded).
        </p>
        {error ? <div className="badge danger">{error}</div> : null}

        <RequireRole role="Admin">
          <div className="card" style={{ boxShadow: "none", marginTop: 10 }}>
            <div className="row">
              <label style={{ display: "grid", gap: 6, minWidth: 180 }}>
                <span className="muted">Visit date</span>
                <input
                  className="input"
                  type="date"
                  value={visitForm.visitDate}
                  onChange={(e) => setVisitForm((p) => ({ ...p, visitDate: e.target.value }))}
                />
              </label>
              <label style={{ display: "grid", gap: 6, minWidth: 260, flex: 1 }}>
                <span className="muted">Visit type</span>
                <select
                  className="input"
                  value={visitForm.visitType}
                  onChange={(e) => setVisitForm((p) => ({ ...p, visitType: e.target.value }))}
                >
                  <option value="InitialAssessment">Initial assessment</option>
                  <option value="RoutineFollowUp">Routine follow-up</option>
                  <option value="ReintegrationAssessment">Reintegration assessment</option>
                  <option value="PostPlacementMonitoring">Post-placement monitoring</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: 6, minWidth: 220 }}>
                <span className="muted">Social worker</span>
                <input className="input" value={visitForm.socialWorkerName} onChange={(e) => setVisitForm((p) => ({ ...p, socialWorkerName: e.target.value }))} />
              </label>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <label style={{ display: "grid", gap: 6, minWidth: 260, flex: 1 }}>
                <span className="muted">Location visited</span>
                <input className="input" value={visitForm.locationVisited} onChange={(e) => setVisitForm((p) => ({ ...p, locationVisited: e.target.value }))} />
              </label>
              <label style={{ display: "grid", gap: 6, minWidth: 260, flex: 1 }}>
                <span className="muted">Family members present</span>
                <input className="input" value={visitForm.familyMembersPresent} onChange={(e) => setVisitForm((p) => ({ ...p, familyMembersPresent: e.target.value }))} />
              </label>
            </div>

            <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
              <span className="muted">Purpose</span>
              <input className="input" value={visitForm.purpose} onChange={(e) => setVisitForm((p) => ({ ...p, purpose: e.target.value }))} />
            </label>
            <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
              <span className="muted">Observations</span>
              <textarea
                className="input"
                rows={3}
                value={visitForm.observations}
                onChange={(e) => setVisitForm((p) => ({ ...p, observations: e.target.value }))}
              />
            </label>

            <div className="row" style={{ marginTop: 10 }}>
              <label style={{ display: "grid", gap: 6, minWidth: 240, flex: 1 }}>
                <span className="muted">Family cooperation level</span>
                <input
                  className="input"
                  value={visitForm.familyCooperationLevel}
                  onChange={(e) => setVisitForm((p) => ({ ...p, familyCooperationLevel: e.target.value }))}
                  placeholder="e.g., high / medium / low"
                />
              </label>
              <label style={{ display: "grid", gap: 6, minWidth: 240, flex: 1 }}>
                <span className="muted">Safety concerns</span>
                <input
                  className="input"
                  value={visitForm.safetyConcerns}
                  onChange={(e) => setVisitForm((p) => ({ ...p, safetyConcerns: e.target.value }))}
                />
              </label>
            </div>

            <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
              <span className="muted">Visit outcome</span>
              <input className="input" value={visitForm.visitOutcome} onChange={(e) => setVisitForm((p) => ({ ...p, visitOutcome: e.target.value }))} />
            </label>
            <div className="row" style={{ marginTop: 8 }}>
              <label className="row"><input type="checkbox" checked={visitForm.safetyConcernsNoted} onChange={(e) => setVisitForm((p) => ({ ...p, safetyConcernsNoted: e.target.checked }))} /> Safety concerns noted</label>
              <label className="row"><input type="checkbox" checked={visitForm.followUpNeeded} onChange={(e) => setVisitForm((p) => ({ ...p, followUpNeeded: e.target.checked }))} /> Follow-up needed</label>
            </div>
            <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
              <span className="muted">Follow-up notes</span>
              <input className="input" value={visitForm.followUpNotes} onChange={(e) => setVisitForm((p) => ({ ...p, followUpNotes: e.target.value }))} />
            </label>
            <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
              <span className="muted">Follow-up actions</span>
              <input
                className="input"
                value={visitForm.followUpActions}
                onChange={(e) => setVisitForm((p) => ({ ...p, followUpActions: e.target.value }))}
              />
            </label>

            <div className="row" style={{ marginTop: 12, justifyContent: "flex-end" }}>
              <button
                className="btn primary"
                onClick={async () => {
                  setError(null);
                  if (!visitForm.observations.trim()) {
                    setError("Observations are required.");
                    return;
                  }
                  try {
                    await apiFetch<void>("/api/home-visitations", {
                      method: "POST",
                      token: auth.token ?? undefined,
                      body: JSON.stringify({
                        residentId,
                        visitDate: visitForm.visitDate,
                        socialWorkerName: visitForm.socialWorkerName.trim() || null,
                        visitType: visitForm.visitType,
                        locationVisited: visitForm.locationVisited.trim() || null,
                        familyMembersPresent: visitForm.familyMembersPresent.trim() || null,
                        purpose: visitForm.purpose.trim() || null,
                        observations: visitForm.observations.trim(),
                        familyCooperationLevel: visitForm.familyCooperationLevel.trim() || null,
                        safetyConcernsNoted: visitForm.safetyConcernsNoted,
                        followUpNeeded: visitForm.followUpNeeded,
                        followUpNotes: visitForm.followUpNotes.trim() || null,
                        visitOutcome: visitForm.visitOutcome.trim() || null,
                        safetyConcerns: visitForm.safetyConcerns.trim() || null,
                        followUpActions: visitForm.followUpActions.trim() || null,
                      }),
                    });
                    setVisitForm((p) => ({ ...p, observations: "", familyCooperationLevel: "", followUpNotes: "", visitOutcome: "", safetyConcerns: "", followUpActions: "" }));
                    await load();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Add visit
              </button>
            </div>
          </div>
        </RequireRole>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Observations</th>
                <th style={{ width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visitRows.map((x) => (
                <tr key={x.homeVisitationId}>
                  <td data-label="Date">{x.visitDate}</td>
                  <td data-label="Type">
                    <span className="badge">{x.visitType}</span>
                  </td>
                  <td data-label="Observations" className="muted">
                    {x.observations ?? "—"}
                  </td>
                  <td data-label="Actions">
                    <RequireRole role="Admin">
                      <button
                        className="btn danger"
                        onClick={async () => {
                          if (!confirm("Delete this visitation record?")) return;
                          try {
                            await apiFetch<void>(`/api/home-visitations/${x.homeVisitationId}?confirm=true`, {
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
                    </RequireRole>
                  </td>
                </tr>
              ))}
              {data && visitRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">
                    No home visitations yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={visitPage}
          totalPages={visitTotalPages}
          onPrev={() => setVisitPage((p) => Math.max(1, p - 1))}
          onNext={() => setVisitPage((p) => Math.min(visitTotalPages, p + 1))}
        />
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>Case conferences</h2>
        </div>
        <RequireRole role="Admin">
          <div className="row" style={{ marginTop: 8 }}>
            <input
              className="input"
              placeholder="Scheduled UTC (e.g., 2026-04-10T14:00:00Z)"
              value={conferenceForm.scheduledAtUtc}
              onChange={(e) => setConferenceForm((p) => ({ ...p, scheduledAtUtc: e.target.value }))}
            />
            <input className="input" placeholder="Topic" value={conferenceForm.topic} onChange={(e) => setConferenceForm((p) => ({ ...p, topic: e.target.value }))} />
            <input className="input" placeholder="Notes (optional)" value={conferenceForm.notes} onChange={(e) => setConferenceForm((p) => ({ ...p, notes: e.target.value }))} />
            <button
              className="btn primary"
              onClick={async () => {
                if (!conferenceForm.scheduledAtUtc.trim() || !conferenceForm.topic.trim()) {
                  setError("Conference time and topic are required.");
                  return;
                }
                try {
                  await apiFetch<void>("/api/case-conferences", {
                    method: "POST",
                    token: auth.token ?? undefined,
                    body: JSON.stringify({
                      residentId,
                      scheduledAtUtc: conferenceForm.scheduledAtUtc.trim(),
                      topic: conferenceForm.topic.trim(),
                      notes: conferenceForm.notes.trim() || null,
                      isCompleted: false,
                    }),
                  });
                  setConferenceForm({ scheduledAtUtc: "", topic: "", notes: "" });
                  await load();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Schedule conference
            </button>
          </div>
        </RequireRole>

        <div className="table-wrap">
          <table className="table" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Scheduled (UTC)</th>
                <th>Topic</th>
                <th>Status</th>
                <th style={{ width: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {confRows.map((x) => (
                <tr key={x.caseConferenceId}>
                  <td data-label="Scheduled (UTC)" className="muted">
                    {x.scheduledAtUtc}
                  </td>
                  <td data-label="Topic">{x.topic ?? "—"}</td>
                  <td data-label="Status">
                    {x.isCompleted ? <span className="badge">Completed</span> : <span className="badge">Upcoming</span>}
                  </td>
                  <td data-label="Actions">
                    <RequireRole role="Admin">
                      <div className="row">
                        <button
                          className="btn"
                          onClick={async () => {
                            try {
                              await apiFetch<void>(`/api/case-conferences/${x.caseConferenceId}`, {
                                method: "PUT",
                                token: auth.token ?? undefined,
                                body: JSON.stringify({ ...x, isCompleted: !x.isCompleted }),
                              });
                              await load();
                            } catch (e) {
                              setError((e as Error).message);
                            }
                          }}
                        >
                          Toggle done
                        </button>
                        <button
                          className="btn danger"
                          onClick={async () => {
                            if (!confirm("Delete this conference?")) return;
                            try {
                              await apiFetch<void>(`/api/case-conferences/${x.caseConferenceId}?confirm=true`, {
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
                      </div>
                    </RequireRole>
                  </td>
                </tr>
              ))}
              {confs && confRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">
                    No case conferences yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={confPage}
          totalPages={confTotalPages}
          onPrev={() => setConfPage((p) => Math.max(1, p - 1))}
          onNext={() => setConfPage((p) => Math.min(confTotalPages, p + 1))}
        />
      </div>
    </div>
  );
}
