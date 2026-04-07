import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import { StatCard } from "../../components/ui/StatCard";

type Snapshot = {
  snapshotId: number;
  snapshotDate: string;
  headline: string;
  summaryText: string;
  metricPayloadJson: string;
};

type Highlights = {
  asOfUtc: string;
  activeSafehouses: number;
  totalBedsCapacity: number;
  totalCurrentOccupancy: number;
  latestMonthSummary: null | {
    monthStart: string;
    activeResidentsTotal: number;
    avgEducationProgress: number | null;
    avgHealthScore: number | null;
    counselingSessionsMonth: number;
    homeVisitsMonth: number;
    incidentsMonth: number;
  };
  socialEstimatedDonationValuePhp: number;
  socialPostsWithDonationReferrals: number;
  publishedImpactSnapshots: number;
  activeSupporters: number;
};

function formatMonth(d: string) {
  const x = new Date(d + "T12:00:00");
  return x.toLocaleString(undefined, { month: "long", year: "numeric" });
}

export function ImpactPage() {
  const [items, setItems] = useState<Snapshot[]>([]);
  const [highlights, setHighlights] = useState<Highlights | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [snapshots, hi] = await Promise.all([
          apiFetch<Snapshot[]>("/api/public/impact-snapshots"),
          apiFetch<Highlights>("/api/public/impact-highlights"),
        ]);
        setItems(snapshots);
        setHighlights(hi);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  const lm = highlights?.latestMonthSummary;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Impact Dashboard</h1>
        <p className="muted">
          Aggregated, anonymized view of services supporting South Korean victims: safe shelter, education and wellbeing
          progress, field engagement, and outreach effectiveness—without identifying any resident.
        </p>
        <div className="badge ok">Identity-stripped public reporting: no names, addresses, or case file details.</div>

        {error ? (
          <div className="badge danger" style={{ marginTop: 10 }}>
            {error}
          </div>
        ) : null}

        {highlights ? (
          <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            Figures refresh from live data · updated {new Date(highlights.asOfUtc).toLocaleString()}
          </div>
        ) : null}
      </div>

      <div className="photo-grid">
        <div className="photo-placeholder" role="img" aria-label="Safehouse community support session">
          <img src="/reference/hero-ribbon.png" alt="Safehouse recovery and support environment." />
          <div className="caption">Safehouse recovery support</div>
        </div>
        <div className="photo-placeholder" role="img" aria-label="Social workers documenting program outcomes">
          <img src="/reference/secure-anonymized-reporting.jpg" alt="Privacy-safe analytics and impact reporting visual." />
          <div className="caption">Transparent impact tracking</div>
        </div>
        <div className="photo-placeholder" role="img" aria-label="Donors and partners supporting Korean victim programs">
          <img src="/reference/donor-impact-community.jpg" alt="Donors and partners collaborating for support programs." />
          <div className="caption">Donor and partner collaboration</div>
        </div>
      </div>

      {highlights ? (
        <>
          <div className="card" style={{ background: "linear-gradient(135deg, rgba(124,108,255,0.12), rgba(45,212,191,0.08))" }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Why this work matters for partners and donors</h2>
            <p className="muted" style={{ marginTop: 8, lineHeight: 1.65 }}>
              Every gift and every hour of advocacy translates into measurable program activity: victims housed within licensed
              capacity, documented counseling and home visits, and education and health trends tracked the same way agencies
              expect in annual accomplishment reporting. Social outreach is tied to modeled donation impact so you can see
              which channels help the mission scale.
            </p>
          </div>

          <div className="kpi-grid">
            <StatCard
              label="Active safehouses"
              value={highlights.activeSafehouses}
              hint={`${highlights.totalCurrentOccupancy} girls housed · ${highlights.totalBedsCapacity} total bed capacity`}
              tone="brand"
            />
            <StatCard
              label="Community on record"
              value={highlights.activeSupporters}
              hint="Supporters and advocates, aggregate count"
            />
            <StatCard
              label="Social-attributed giving, modeled"
              value={`₱${highlights.socialEstimatedDonationValuePhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              hint={`${highlights.socialPostsWithDonationReferrals} posts linked to referral activity`}
              tone="ok"
            />
            <StatCard
              label="Published story cards"
              value={highlights.publishedImpactSnapshots}
              hint="Monthly snapshots below"
            />
          </div>

          {lm ? (
            <div className="card">
              <h2 style={{ marginTop: 0, fontSize: 18 }}>Latest program month · {formatMonth(lm.monthStart)}</h2>
              <p className="muted" style={{ marginTop: 6 }}>
                Rolled up from safehouse monthly metrics—same family of indicators agencies use for supervision and reporting.
              </p>
              <div className="kpi-grid" style={{ marginTop: 12 }}>
                <StatCard label="Resident-months in program" value={lm.activeResidentsTotal} />
                <StatCard
                  label="Avg education progress"
                  value={lm.avgEducationProgress != null ? `${lm.avgEducationProgress}%` : "—"}
                  hint="Across sites, monthly average"
                />
                <StatCard
                  label="Avg wellbeing score"
                  value={lm.avgHealthScore != null ? lm.avgHealthScore.toFixed(2) : "—"}
                  hint="General health score on a one to five scale"
                />
                <StatCard label="Counseling sessions logged" value={lm.counselingSessionsMonth} tone="ok" />
                <StatCard label="Home / field visits" value={lm.homeVisitsMonth} />
                <StatCard label="Incidents documented" value={lm.incidentsMonth} tone="warn" />
              </div>
            </div>
          ) : (
            <div className="card muted">
              No <code>safehouse_monthly_metrics</code> rows yet. After CSV import, latest-month tiles will appear here.
            </div>
          )}
        </>
      ) : null}

      <div className="card">
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Published monthly snapshots</h2>
        <p className="muted" style={{ marginTop: 6 }}>
          Curated headlines for donors—staff publish these from Reports &amp; Analytics.{" "}
          <Link to="/give" className="muted" style={{ textDecoration: "underline" }}>
            Ready to give?
          </Link>
        </p>

        {items.length === 0 && !error ? <div className="muted">No published snapshots yet.</div> : null}

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          {items.map((x) => (
            <div key={x.snapshotId} className="card" style={{ boxShadow: "none" }}>
              <div className="muted" style={{ fontSize: 12 }}>
                {x.snapshotDate}
              </div>
              <div style={{ fontWeight: 800, marginTop: 6 }}>{x.headline}</div>
              <div className="muted" style={{ marginTop: 6 }}>
                {x.summaryText}
              </div>
              {(() => {
                try {
                  const obj = JSON.parse(x.metricPayloadJson) as Record<string, unknown>;
                  const rows = Object.entries(obj)
                    .slice(0, 12)
                    .map(([k, v]) => ({
                      key: k.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase()),
                      value: typeof v === "number" ? v.toLocaleString() : String(v),
                    }));
                  return rows.length ? (
                    <ul className="muted trust-list">
                      {rows.map((r) => (
                        <li key={r.key}>
                          {r.key}: {r.value}
                        </li>
                      ))}
                    </ul>
                  ) : null;
                } catch {
                  return <div className="muted" style={{ marginTop: 8 }}>Additional impact details are being prepared in a reader-friendly format.</div>;
                }
              })()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
