import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { StatCard } from "../../components/ui/StatCard";
import { apiFetch } from "../../lib/api";

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

export function ImpactPage() {
  const loc = useLocation();
  const inAppShell = loc.pathname.startsWith("/app/");
  const donateRoute = inAppShell ? "/app/donate" : "/donate";
  const [highlights, setHighlights] = useState<Highlights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const hi = await apiFetch<Highlights>("/api/public/impact-highlights");
        setHighlights(hi);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const lm = highlights?.latestMonthSummary;
  const occupancyRate =
    highlights && highlights.totalBedsCapacity > 0
      ? Math.round((highlights.totalCurrentOccupancy / highlights.totalBedsCapacity) * 100)
      : null;
  const availableBeds =
    highlights ? Math.max(0, highlights.totalBedsCapacity - highlights.totalCurrentOccupancy) : null;
  const availableBedsRate =
    highlights && highlights.totalBedsCapacity > 0 && availableBeds != null
      ? Math.round((availableBeds / highlights.totalBedsCapacity) * 100)
      : null;
  const serviceTotal = lm ? lm.counselingSessionsMonth + lm.homeVisitsMonth : 0;

  return (
    <div className="impact-page">
      <section className="impact-proof-hero card">
        <div className="impact-proof-header">
          <div>
            <div className="sub-kicker">Impact at a glance</div>
            <h1>Your support helps provide safety, care, and steady follow-up.</h1>
          </div>
          <p className="muted">
            This page shows the kind of support donors help make possible across shelter, counseling, wellbeing,
            education, and follow-up while protecting survivor privacy.
          </p>
        </div>

        {highlights ? (
          <>
            <div className="impact-proof-grid">
              <StatCard
                label="Active safehouses"
                value={highlights.activeSafehouses}
                hint={`${highlights.totalCurrentOccupancy} residents are currently being housed across ${highlights.totalBedsCapacity} beds`}
                tone="brand"
              />
              <StatCard
                label="Residents in care"
                value={highlights.totalCurrentOccupancy}
                hint={availableBeds != null ? `${availableBeds} beds currently available` : "Current safehouse occupancy"}
                tone="ok"
              />
              <StatCard
                label="Counseling sessions"
                value={lm ? lm.counselingSessionsMonth : "-"}
                hint={lm ? `Recorded in ${formatMonth(lm.monthStart)}` : "Latest month pending"}
                tone="ok"
              />
              <StatCard label="Home and field visits" value={lm ? lm.homeVisitsMonth : "-"} hint="Follow-up with survivors and families" />
            </div>
            <div className="impact-proof-note">
              Figures refresh from live data and were last updated {new Date(highlights.asOfUtc).toLocaleString()}.
            </div>
          </>
        ) : (
          <div className="impact-loading-inline">
            {loading ? "Retrieving impact highlights..." : "Impact highlights are being refreshed. Please check back shortly."}
          </div>
        )}

        {error ? <div className="badge warn impact-error">Retrieving impact highlights right now.</div> : null}

        <div className="donor-hero-actions">
          <Link className="btn primary donor-primary-cta" to={donateRoute}>
            Donate now
          </Link>
          <Link className="btn" to="/programs">
            How we help
          </Link>
        </div>
      </section>

      <section className="impact-evidence-section" aria-label="Impact evidence and reporting safety">
        <div className="card impact-chart-card impact-evidence-card">
          <div className="sub-kicker">Recent care activity</div>
          <h2>What recent care has looked like</h2>
          <div className="impact-bar-list">
            <div className="impact-bar-row">
              <span>Counseling sessions</span>
              <div>
                <i style={{ width: `${Math.max(8, Math.min(100, (lm?.counselingSessionsMonth ?? 0) * 8))}%` }} />
              </div>
              <strong>{lm ? lm.counselingSessionsMonth : "-"}</strong>
            </div>
            <div className="impact-bar-row">
              <span>Home and field visits</span>
              <div>
                <i style={{ width: `${Math.max(8, Math.min(100, (lm?.homeVisitsMonth ?? 0) * 10))}%` }} />
              </div>
              <strong>{lm ? lm.homeVisitsMonth : "-"}</strong>
            </div>
            <div className="impact-bar-row">
              <span>Safehouse occupancy</span>
              <div>
                <i style={{ width: `${Math.max(0, Math.min(100, occupancyRate ?? 0))}%` }} />
              </div>
              <strong>{occupancyRate != null ? `${occupancyRate}%` : "-"}</strong>
            </div>
            <div className="impact-bar-row">
              <span>Available beds</span>
              <div>
                <i style={{ width: `${Math.max(0, Math.min(100, availableBedsRate ?? 0))}%` }} />
              </div>
              <strong>{availableBeds != null ? availableBeds : "-"}</strong>
            </div>
          </div>
          <p className="muted">
            These broad indicators help donors understand the work without exposing private case details.
          </p>
        </div>

        <div className="impact-visual-proof card">
          <img src="/photos/community-support.jpg" alt="Community partners preparing support for survivors." />
          <div>
            <div className="sub-kicker">Privacy-safe proof</div>
            <h2>No resident-identifying details shown.</h2>
            <p className="muted">
              We share progress through summary numbers, carefully written stories, and public updates. Private case
              details stay with authorized staff.
            </p>
          </div>
        </div>
      </section>

      <section className="card donor-section">
        <div className="section-intro">
          <div className="sub-kicker">Stories of impact</div>
          <h2 className="section-title">Numbers show reach. Stories show why it matters.</h2>
          <p className="muted">
            These examples show the kind of change donor support can make while protecting privacy and avoiding
            identifying details.
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
            <div className="sub-kicker">What support makes possible</div>
            <h2 className="section-title">Care is more than a safe bed for one night.</h2>
            <p className="muted">
              Survivors need consistent shelter, trusted adults, and ongoing support to keep moving forward.
            </p>
          </div>
          <div className="kpi-grid">
            <StatCard
              label="Total bed capacity"
              value={highlights.totalBedsCapacity}
              hint="Available space across active safehouses"
            />
            <StatCard
              label="Documented services"
              value={serviceTotal || "-"}
              hint="Counseling sessions and home visits in the latest month"
              tone="ok"
            />
            <StatCard
              label="Supporter community"
              value={highlights.activeSupporters}
              hint="People helping keep care moving"
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
              This monthly snapshot gives a simple view of recent care activity without exposing private records.
            </p>
            <div className="impact-mini-grid">
              <StatCard label="Resident-months" value={lm.activeResidentsTotal} />
              <StatCard label="Counseling sessions" value={lm.counselingSessionsMonth} tone="ok" />
              <StatCard label="Home and field visits" value={lm.homeVisitsMonth} />
              <StatCard
                label="Beds available"
                value={availableBeds != null ? availableBeds : "-"}
                tone="brand"
              />
            </div>
          </div>

          <div className="card impact-chart-card">
            <div className="sub-kicker">Why steady support matters</div>
            <h2>Recovery takes more than one moment of help.</h2>
            <p className="muted">
              Safe shelter is only the beginning. Survivors may also need counseling, health support, education help,
              family follow-up, and reintegration planning over time.
            </p>
            <div className="program-support-list">
              <div>Safe shelter creates space for recovery to begin.</div>
              <div>Counseling and home visits help staff follow up with care.</div>
              <div>Education and wellbeing support help survivors rebuild stability.</div>
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
            Donors should be able to see that support is reaching real needs. We share progress, services, and
            broad outcomes while keeping private case details protected.
          </p>
          <Link className="btn" to="/privacy">
            Read our privacy policy
          </Link>
        </div>
        <div className="program-support-list">
          <div>Public updates focus on progress, not private case files.</div>
          <div>Gifts are reflected through care activity, public updates, and visible results.</div>
          <div>Detailed case information stays with authorized staff.</div>
        </div>
      </section>

      <section className="cta-ribbon donor-final-cta">
        <div className="sub-kicker">Help the care pathway continue</div>
        <h2>Support safe shelter, healing, education, and reintegration work today.</h2>
        <Link className="btn primary donor-primary-cta" to={donateRoute}>
          Donate now
        </Link>
      </section>
    </div>
  );
}
