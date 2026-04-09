import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StatCard } from "../../components/ui/StatCard";
import { apiFetch } from "../../lib/api";

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

const impactStories = [
  {
    name: "Hana",
    title: "A safer first night",
    image: "/photos/shelter-recovery.jpg",
    note: "Name changed. Placeholder photo.",
    text:
      "When Hana first reached the safehouse, the immediate goal was simple: help her rest somewhere safe and make sure she did not have to explain everything at once. Donor support helped provide emergency essentials, meals, transportation coordination, and the first case follow-up. By the next morning, staff had a safer plan for counseling, health check-ins, and the next steps in her care pathway.",
  },
  {
    name: "Minseo",
    title: "A path back to learning",
    image: "/photos/education-support.jpg",
    note: "Name changed. Placeholder photo.",
    text:
      "Minseo wanted to return to a normal rhythm, but school and daily routines felt overwhelming after months of disruption. Through education and wellbeing support, staff helped track her progress, coordinate learning resources, and build confidence one step at a time. Her story is why public impact reporting includes more than shelter numbers: healing also means stability, learning, and hope.",
  },
  {
    name: "Jisoo",
    title: "A careful plan forward",
    image: "/photos/wellbeing-checkin.jpg",
    note: "Name changed. Placeholder photo.",
    text:
      "For Jisoo, leaving the safehouse was not a single decision. It took home visits, family cooperation notes, case conferences, and careful conversations with trained staff. Donor support helped make that slow work possible. The goal was not to rush her into independence, but to help staff understand what support would make her next step safer.",
  },
];

function formatMonth(d: string) {
  const x = new Date(d + "T12:00:00");
  return x.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function formatSnapshotDate(d: string) {
  const x = new Date(d + "T12:00:00");
  return Number.isNaN(x.valueOf())
    ? d
    : x.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatPhp(value: number) {
  return `PHP ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function getSnapshotMetrics(snapshot: Snapshot) {
  try {
    const obj = JSON.parse(snapshot.metricPayloadJson) as Record<string, unknown>;
    return Object.entries(obj)
      .slice(0, 6)
      .map(([key, value]) => ({
        key: key.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase()),
        value: typeof value === "number" ? value.toLocaleString() : String(value),
      }));
  } catch {
    return [];
  }
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
  const occupancyRate =
    highlights && highlights.totalBedsCapacity > 0
      ? Math.round((highlights.totalCurrentOccupancy / highlights.totalBedsCapacity) * 100)
      : null;
  const educationProgress = lm?.avgEducationProgress ?? null;
  const wellbeingScore = lm?.avgHealthScore ?? null;
  const serviceTotal = lm ? lm.counselingSessionsMonth + lm.homeVisitsMonth : 0;

  return (
    <div className="impact-page">
      <section className="impact-proof-hero card">
        <div className="impact-proof-header">
          <div>
            <div className="sub-kicker">Impact at a glance</div>
            <h1>Your support is creating measurable change.</h1>
          </div>
          <p className="muted">
            Public impact reporting should show proof quickly. These figures are aggregate, anonymized signals across
            safe shelter, healing, wellbeing, and outreach, with no resident-identifying case details shown.
          </p>
        </div>

        {highlights ? (
          <>
            <div className="impact-proof-grid">
              <StatCard
                label="Active safehouses"
                value={highlights.activeSafehouses}
                hint={`${highlights.totalCurrentOccupancy} residents housed across ${highlights.totalBedsCapacity} beds`}
                tone="brand"
              />
              <StatCard
                label="Occupancy"
                value={occupancyRate != null ? `${occupancyRate}%` : "-"}
                hint="Current occupancy across safehouse capacity"
                tone="ok"
              />
              <StatCard
                label="Counseling sessions"
                value={lm ? lm.counselingSessionsMonth : "-"}
                hint={lm ? `Latest reporting month: ${formatMonth(lm.monthStart)}` : "Latest month pending"}
                tone="ok"
              />
              <StatCard label="Home and field visits" value={lm ? lm.homeVisitsMonth : "-"} hint="Follow-up care activity" />
            </div>
            <div className="impact-proof-note">
              Figures refresh from live data and were last updated {new Date(highlights.asOfUtc).toLocaleString()}.
            </div>
          </>
        ) : !error ? (
          <div className="impact-loading-inline">Impact highlights will appear here once the public API responds.</div>
        ) : null}

        {error ? <div className="badge danger impact-error">{error}</div> : null}

        <div className="donor-hero-actions">
          <Link className="btn primary donor-primary-cta" to="/donate">
            Donate now
          </Link>
          <Link className="btn" to="/programs">
            How we help
          </Link>
        </div>
      </section>

      <section className="impact-evidence-section" aria-label="Impact evidence and reporting safety">
        <div className="card impact-chart-card impact-evidence-card">
          <div className="sub-kicker">Care progress indicators</div>
          <h2>Evidence from the latest reporting month</h2>
          <div className="impact-bar-list">
            <div className="impact-bar-row">
              <span>Education progress</span>
              <div>
                <i style={{ width: `${Math.max(0, Math.min(100, educationProgress ?? 0))}%` }} />
              </div>
              <strong>{educationProgress != null ? `${educationProgress}%` : "-"}</strong>
            </div>
            <div className="impact-bar-row">
              <span>Wellbeing score</span>
              <div>
                <i style={{ width: `${Math.max(0, Math.min(100, (wellbeingScore ?? 0) * 20))}%` }} />
              </div>
              <strong>{wellbeingScore != null ? `${wellbeingScore.toFixed(2)} / 5` : "-"}</strong>
            </div>
            <div className="impact-bar-row">
              <span>Safehouse occupancy</span>
              <div>
                <i style={{ width: `${Math.max(0, Math.min(100, occupancyRate ?? 0))}%` }} />
              </div>
              <strong>{occupancyRate != null ? `${occupancyRate}%` : "-"}</strong>
            </div>
            <div className="impact-bar-row">
              <span>Documented services</span>
              <div>
                <i style={{ width: `${Math.max(8, Math.min(100, serviceTotal * 8))}%` }} />
              </div>
              <strong>{serviceTotal || "-"}</strong>
            </div>
          </div>
          <p className="muted">
            These are public summary signals, not resident-level outcomes. They help donors see activity and momentum
            while protecting private care records.
          </p>
        </div>

        <div className="impact-visual-proof card">
          <img src="/photos/community-support.jpg" alt="Community partners preparing support for survivors." />
          <div>
            <div className="sub-kicker">Privacy-safe proof</div>
            <h2>No resident-identifying details shown.</h2>
            <p className="muted">
              Impact is reported through aggregate numbers, permission-based stories, and public snapshots. Staff-only
              details remain behind authenticated role-based access.
            </p>
          </div>
        </div>
      </section>

      <section className="card donor-section">
        <div className="section-intro">
          <div className="sub-kicker">Stories of impact</div>
          <h2 className="section-title">Numbers show reach. Stories show why it matters.</h2>
          <p className="muted">
            These public-safe examples are written without identifying details. Real organizations would only publish
            survivor stories with permission and careful review.
          </p>
        </div>
        <div className="impact-story-grid">
          {impactStories.map((story) => (
            <article className="impact-story-card" key={story.name}>
              <img src={story.image} alt={`Placeholder portrait for ${story.name}.`} />
              <div>
                <span className="impact-story-meta">{story.note}</span>
                <h3>{story.name}'s story: {story.title}</h3>
                <p>{story.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {highlights ? (
        <section className="impact-kpi-panel card">
          <div className="section-intro">
            <div className="sub-kicker">More live signals</div>
            <h2 className="section-title">Support, outreach, and published updates.</h2>
            <p className="muted">
              These additional indicators help donors understand the wider support network around the care pathway.
            </p>
          </div>
          <div className="kpi-grid">
            <StatCard
              label="Supporter community"
              value={highlights.activeSupporters}
              hint="Active donors, advocates, and supporters on record"
            />
            <StatCard
              label="Outreach-attributed giving"
              value={formatPhp(highlights.socialEstimatedDonationValuePhp)}
              hint={`${highlights.socialPostsWithDonationReferrals} public posts linked to referral activity`}
              tone="ok"
            />
            <StatCard
              label="Published updates"
              value={highlights.publishedImpactSnapshots}
              hint="Public snapshot cards available below"
              tone="brand"
            />
          </div>
        </section>
      ) : null}

      {lm ? (
        <section className="impact-month-grid">
          <div className="card impact-month-card">
            <div className="sub-kicker">Latest care month</div>
            <h2 className="section-title">{formatMonth(lm.monthStart)}</h2>
            <p className="muted">
              These monthly signals are rolled up from safehouse activity so donors can understand the work without
              exposing case files.
            </p>
            <div className="impact-mini-grid">
              <StatCard label="Resident-months" value={lm.activeResidentsTotal} />
              <StatCard label="Counseling sessions" value={lm.counselingSessionsMonth} tone="ok" />
              <StatCard label="Home and field visits" value={lm.homeVisitsMonth} />
              <StatCard label="Incidents documented" value={lm.incidentsMonth} tone="warn" />
            </div>
          </div>

          <div className="card impact-chart-card">
            <div className="sub-kicker">Outreach signal</div>
            <h2>How public engagement supports care</h2>
            <p className="muted">
              Outreach does not replace direct care, but it can help the mission reach more donors and partners.
            </p>
            <div className="impact-outreach-number">
              <span>Modeled outreach-attributed giving</span>
              <strong>{highlights ? formatPhp(highlights.socialEstimatedDonationValuePhp) : "-"}</strong>
            </div>
            <div className="impact-outreach-number">
              <span>Posts linked to donation referral activity</span>
              <strong>{highlights?.socialPostsWithDonationReferrals ?? "-"}</strong>
            </div>
          </div>
        </section>
      ) : highlights ? (
        <section className="card impact-loading">
          <div className="sub-kicker">Monthly reporting</div>
          <p className="muted">
            Monthly safehouse metrics will appear here once operational data has been published for the public dashboard.
          </p>
        </section>
      ) : null}

      <section className="impact-preview card">
        <div>
          <div className="sub-kicker">Why this reporting matters</div>
          <h2 className="section-title">Transparent enough for donors. Private enough for survivors.</h2>
          <p className="muted">
            Donors should be able to see whether support is reaching the care pathway. Public reporting focuses on
            capacity, services, outreach, and published snapshots while sensitive case details remain restricted.
          </p>
          <Link className="btn" to="/privacy">
            Read our privacy policy
          </Link>
        </div>
        <div className="program-support-list">
          <div>Public summaries use aggregate data instead of resident names or case file details.</div>
          <div>Donation impact is shown through care activity, allocations, outreach, and monthly snapshots.</div>
          <div>Staff-facing details stay behind authenticated role-based access controls.</div>
        </div>
      </section>

      <section className="card donor-section">
        <div className="section-intro">
          <div className="sub-kicker">Published impact snapshots</div>
          <h2 className="section-title">Recent updates for donors and partners.</h2>
          <p className="muted">
            These story cards are curated from Reports and Analytics so supporters can follow progress in a reader-friendly
            way.
          </p>
        </div>

        {items.length === 0 && !error ? <div className="muted">No published snapshots yet.</div> : null}

        <div className="impact-snapshot-grid">
          {items.map((snapshot) => {
            const metrics = getSnapshotMetrics(snapshot);
            return (
              <article className="impact-snapshot-card" key={snapshot.snapshotId}>
                <div className="impact-snapshot-date">{formatSnapshotDate(snapshot.snapshotDate)}</div>
                <h3>{snapshot.headline}</h3>
                <p>{snapshot.summaryText}</p>
                {metrics.length ? (
                  <div className="impact-snapshot-metrics">
                    {metrics.map((metric) => (
                      <span key={metric.key}>
                        <strong>{metric.value}</strong>
                        {metric.key}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="muted">Additional impact details are being prepared in a reader-friendly format.</div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="cta-ribbon donor-final-cta">
        <div className="sub-kicker">Help the care pathway continue</div>
        <h2>Support safe shelter, healing, education, and reintegration work today.</h2>
        <Link className="btn primary donor-primary-cta" to="/donate">
          Donate now
        </Link>
      </section>
    </div>
  );
}
