import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";

type ProgramInsights = {
  asOfUtc: string;
  socialRoi: {
    totalBoostSpendPhp: number;
    totalEstimatedDonationValuePhp: number;
    topPosts: {
      postId: number;
      platform: string;
      postType: string;
      campaignName: string | null;
      referrals: number;
      estimatedValuePhp: number;
      isBoosted: boolean;
      boostPhp: number;
    }[];
  };
};

type SocialPredictionRow = {
  postId: number;
  platform: string;
  postType: string;
  campaignName: string | null;
  predictedValuePhp: number;
  valueBand: string | null;
  contentTopic: string | null;
  callToActionType: string | null;
  estimatedValuePhp: number | null;
  donationReferrals: number | null;
  isBoosted: boolean | null;
};

function rankByValue<T>(
  rows: T[],
  keySelector: (row: T) => string | null | undefined,
  valueSelector: (row: T) => number,
  extraSelector?: (row: T) => number,
) {
  const map = new Map<string, { value: number; extra: number; count: number }>();
  for (const row of rows) {
    const key = keySelector(row)?.trim() || "Unspecified";
    const current = map.get(key) ?? { value: 0, extra: 0, count: 0 };
    current.value += valueSelector(row);
    current.extra += extraSelector ? extraSelector(row) : 0;
    current.count += 1;
    map.set(key, current);
  }
  return [...map.entries()].sort((a, b) => b[1].value - a[1].value);
}

export function SocialMediaStrategyPage() {
  const auth = useAuth();
  const token = auth.token ?? undefined;
  const [data, setData] = useState<ProgramInsights | null>(null);
  const [predictions, setPredictions] = useState<SocialPredictionRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [insightsRes, predictionsRes] = await Promise.allSettled([
        apiFetch<ProgramInsights>("/api/analytics/program-insights", { token }),
        apiFetch<SocialPredictionRow[]>("/api/ml/social-post-value/top?take=12", { token }),
      ]);

      const errs: string[] = [];
      if (insightsRes.status === "fulfilled") setData(insightsRes.value);
      else errs.push(`Program insights: ${(insightsRes.reason as Error).message}`);
      if (predictionsRes.status === "fulfilled") setPredictions(predictionsRes.value);
      else errs.push(`Social post value: ${(predictionsRes.reason as Error).message}`);
      setError(errs.length ? errs.join(" | ") : null);
    })();
  }, [token]);

  const observedRows = data?.socialRoi.topPosts ?? [];
  const platformRanked = useMemo(
    () => rankByValue(observedRows, (row) => row.platform, (row) => row.estimatedValuePhp, (row) => row.referrals),
    [observedRows],
  );
  const typeRanked = useMemo(
    () => rankByValue(observedRows, (row) => row.postType, (row) => row.estimatedValuePhp, (row) => row.referrals),
    [observedRows],
  );
  const topicRanked = useMemo(
    () => rankByValue(predictions, (row) => row.contentTopic, (row) => row.predictedValuePhp),
    [predictions],
  );
  const ctaRanked = useMemo(
    () => rankByValue(predictions, (row) => row.callToActionType, (row) => row.predictedValuePhp),
    [predictions],
  );

  const bestPlatform = platformRanked[0]?.[0] ?? "Review channels";
  const secondPlatform = platformRanked[1]?.[0] ?? null;
  const weakestPlatform = platformRanked.at(-1)?.[0] ?? null;
  const bestPostType = typeRanked[0]?.[0] ?? (predictions[0]?.postType || "Story");
  const weakestPostType = typeRanked.at(-1)?.[0] ?? null;
  const bestTopic = topicRanked[0]?.[0] ?? "Progress update";
  const bestCta = ctaRanked[0]?.[0] ?? "Donate";
  const predictedTopRows = [...predictions].sort((a, b) => b.predictedValuePhp - a.predictedValuePhp);
  const topPredicted = predictedTopRows[0] ?? null;
  const postsDrivingDonations = observedRows.filter((row) => row.referrals > 0).length;
  const boostedRows = observedRows.filter((row) => row.isBoosted);
  const nonBoostedRows = observedRows.filter((row) => !row.isBoosted);
  const avgBoostedValue = boostedRows.length
    ? boostedRows.reduce((sum, row) => sum + row.estimatedValuePhp, 0) / boostedRows.length
    : 0;
  const avgOrganicValue = nonBoostedRows.length
    ? nonBoostedRows.reduce((sum, row) => sum + row.estimatedValuePhp, 0) / nonBoostedRows.length
    : 0;
  const overallRoi = data?.socialRoi.totalBoostSpendPhp
    ? data.socialRoi.totalEstimatedDonationValuePhp / data.socialRoi.totalBoostSpendPhp
    : null;

  return (
    <div className="admin-page">
      <div className="card">
        <div className="admin-header-copy">
          <h1 style={{ marginTop: 0 }}>Social Media Strategy</h1>
          <p className="muted">What to post, where to post it, and what is actually leading to donations.</p>
        </div>
        {error ? <div className="badge danger">{error}</div> : null}
      </div>

      <div className="admin-kpi-grid">
        <div className="card admin-kpi tone-peach">
          <div className="muted">Observed social donation value</div>
          <div className="admin-kpi-value">
            PHP {Math.round(data?.socialRoi.totalEstimatedDonationValuePhp ?? 0).toLocaleString()}
          </div>
        </div>
        <div className="card admin-kpi tone-peach">
          <div className="muted">Best platform right now</div>
          <div className="admin-kpi-value" style={{ fontSize: 24 }}>{bestPlatform}</div>
        </div>
        <div className="card admin-kpi tone-peach">
          <div className="muted">Best content type</div>
          <div className="admin-kpi-value" style={{ fontSize: 24 }}>{bestPostType}</div>
        </div>
        <div className="card admin-kpi tone-peach">
          <div className="muted">Posts that drove donations</div>
          <div className="admin-kpi-value">{postsDrivingDonations}</div>
        </div>
      </div>

      <div className="admin-two-column">
        <div className="card">
          <div className="admin-header-copy">
            <h2 style={{ marginTop: 0 }}>What to do this week</h2>
            <p className="muted">A simple posting plan for a small team.</p>
          </div>
          <div className="reports-summary-grid" style={{ marginTop: 12 }}>
            <div className="card tone-aqua" style={{ boxShadow: "none" }}>
              <div className="muted">Lead platform</div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{bestPlatform}</div>
              <div className="muted">
                {secondPlatform ? `Repurpose winners into ${secondPlatform}.` : "Keep the strongest channel consistent."}
              </div>
            </div>
            <div className="card" style={{ boxShadow: "none" }}>
              <div className="muted">Post mix</div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>3 posts</div>
              <div className="muted">Story, need, and gratitude.</div>
            </div>
            <div className="card" style={{ boxShadow: "none" }}>
              <div className="muted">Boosting rule</div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>Be selective</div>
              <div className="muted">Boost only posts that already show traction.</div>
            </div>
          </div>

          <div className="admin-split-grid" style={{ marginTop: 14 }}>
            <div className="card" style={{ boxShadow: "none" }}>
              <strong>Monday · Story</strong>
              <div className="muted" style={{ marginTop: 6 }}>
                Share a {bestTopic.toLowerCase()} with one clear outcome and one simple ask.
              </div>
            </div>
            <div className="card" style={{ boxShadow: "none" }}>
              <strong>Wednesday · Need</strong>
              <div className="muted" style={{ marginTop: 6 }}>
                Post one concrete need tied to a single program area and use a {bestCta.toLowerCase()} CTA.
              </div>
            </div>
          </div>
          <div className="card" style={{ boxShadow: "none", marginTop: 12 }}>
            <strong>Friday · Gratitude</strong>
            <div className="muted" style={{ marginTop: 6 }}>
              Thank supporters with a measurable result from the week and invite them back to the strongest channel.
            </div>
          </div>
        </div>

        <div className="card">
          <div className="admin-header-copy">
            <h2 style={{ marginTop: 0 }}>What is working</h2>
            <p className="muted">Patterns tied to donations, not just attention.</p>
          </div>
          <div className="reports-summary-grid" style={{ marginTop: 12 }}>
            <div className="card" style={{ boxShadow: "none" }}>
              <div className="muted">Best platform</div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{bestPlatform}</div>
              <div className="muted">
                PHP {Math.round(platformRanked[0]?.[1].value ?? 0).toLocaleString()} observed value
              </div>
            </div>
            <div className="card" style={{ boxShadow: "none" }}>
              <div className="muted">Best post type</div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>{bestPostType}</div>
              <div className="muted">
                PHP {Math.round(typeRanked[0]?.[1].value ?? 0).toLocaleString()} observed value
              </div>
            </div>
            <div className="card" style={{ boxShadow: "none" }}>
              <div className="muted">Boosting result</div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>
                {avgBoostedValue > avgOrganicValue ? "Boosted wins" : "Organic wins"}
              </div>
              <div className="muted">
                Avg PHP {Math.round(Math.max(avgBoostedValue, avgOrganicValue)).toLocaleString()} per top post
              </div>
            </div>
          </div>

          <ul className="trust-list muted" style={{ marginTop: 14 }}>
            <li>Lead with {bestPlatform} for the next campaign cycle.</li>
            <li>Use more {bestPostType.toLowerCase()} content tied to clear outcomes.</li>
            <li>Top predicted topic: {bestTopic}.</li>
            <li>Top predicted CTA: {bestCta}.</li>
            {overallRoi !== null ? (
              <li>Observed social ROI is about {overallRoi.toFixed(1)}x estimated donation value to boost spend.</li>
            ) : null}
          </ul>

          <div className="card tone-aqua" style={{ boxShadow: "none", marginTop: 12 }}>
            <strong>What to avoid</strong>
            <ul className="trust-list muted" style={{ marginTop: 8 }}>
              <li>{weakestPlatform ? `Do not lead with ${weakestPlatform} until results improve.` : "Do not spread effort evenly across every platform."}</li>
              <li>{weakestPostType ? `Reduce lower-converting ${weakestPostType.toLowerCase()} posts.` : "Reduce lower-converting post formats."}</li>
              <li>Do not boost posts before they show real referral traction.</li>
              <li>Avoid broad, generic asks that are not tied to one concrete purpose.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="admin-two-column">
        <div className="card">
          <div className="admin-header-copy">
            <h2 style={{ marginTop: 0 }}>Observed winners</h2>
            <p className="muted">Posts that already led to referrals and donation value.</p>
          </div>
          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Post</th>
                  <th>Platform</th>
                  <th>Campaign</th>
                  <th>Referrals</th>
                  <th>Observed value</th>
                </tr>
              </thead>
              <tbody>
                {observedRows.map((post) => (
                  <tr key={post.postId}>
                    <td data-label="Post">
                      #{post.postId} {post.postType}
                    </td>
                    <td data-label="Platform" className="muted">{post.platform}</td>
                    <td data-label="Campaign" className="muted">{post.campaignName ?? "General"}</td>
                    <td data-label="Referrals">{post.referrals}</td>
                    <td data-label="Observed value">
                      PHP {Math.round(post.estimatedValuePhp).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {observedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">No observed conversion rows available yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="admin-header-copy">
            <h2 style={{ marginTop: 0 }}>High-value content options</h2>
            <p className="muted">Strong content directions to consider for the next campaign cycle.</p>
          </div>
          {topPredicted ? (
            <div className="card tone-aqua" style={{ boxShadow: "none", marginTop: 10 }}>
              <strong>Top recommendation</strong>
              <div className="muted" style={{ marginTop: 6 }}>
                Lead with a {topPredicted.postType.toLowerCase()} on {topPredicted.platform} using {topPredicted.callToActionType?.toLowerCase() || "a clear donation"} CTA.
              </div>
            </div>
          ) : null}
          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Content option</th>
                  <th>Platform</th>
                  <th>Predicted value</th>
                  <th>Topic</th>
                  <th>CTA</th>
                </tr>
              </thead>
              <tbody>
                {predictedTopRows.map((post) => (
                  <tr key={post.postId}>
                    <td data-label="Content option">
                      {post.postType}
                      {post.campaignName ? <span className="muted"> · {post.campaignName}</span> : null}
                    </td>
                    <td data-label="Platform" className="muted">{post.platform}</td>
                    <td data-label="Predicted value">
                      PHP {Math.round(post.predictedValuePhp).toLocaleString()}
                    </td>
                    <td data-label="Topic" className="muted">{post.contentTopic ?? "-"}</td>
                    <td data-label="CTA" className="muted">{post.callToActionType ?? "-"}</td>
                  </tr>
                ))}
                {predictedTopRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">No content options available yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="admin-header-copy">
          <h2 style={{ marginTop: 0 }}>Channel comparison</h2>
          <p className="muted">Where donation value is actually coming from.</p>
        </div>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Platform</th>
                <th>Observed value</th>
                <th>Referrals</th>
                <th>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {platformRanked.map(([platform, value], idx) => (
                <tr key={platform}>
                  <td data-label="Platform">{platform}</td>
                  <td data-label="Observed value">
                    PHP {Math.round(value.value).toLocaleString()}
                  </td>
                  <td data-label="Referrals">{value.extra}</td>
                  <td data-label="Recommendation" className="muted">
                    {idx === 0
                      ? "Lead next week here."
                      : idx === 1
                        ? "Repurpose winning creative here."
                        : "Reduce emphasis until results improve."}
                  </td>
                </tr>
              ))}
              {platformRanked.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">No channel comparison rows yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
