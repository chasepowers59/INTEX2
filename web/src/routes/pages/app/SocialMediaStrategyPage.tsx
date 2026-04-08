import React, { useEffect, useState } from "react";
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

export function SocialMediaStrategyPage() {
  const auth = useAuth();
  const token = auth.token ?? undefined;
  const [data, setData] = useState<ProgramInsights | null>(null);
  const [predictions, setPredictions] = useState<SocialPredictionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [storyTheme, setStoryTheme] = useState("Reintegration progress update");
  const [needItem, setNeedItem] = useState("Emergency shelter essentials");
  const [gratitudeFocus, setGratitudeFocus] = useState("Counseling sessions funded this month");

  useEffect(() => {
    (async () => {
      const [insightsRes, predictionsRes] = await Promise.allSettled([
        apiFetch<ProgramInsights>("/api/analytics/program-insights", { token }),
        apiFetch<SocialPredictionRow[]>("/api/ml/social-post-value/top?take=10", { token }),
      ]);

      const errs: string[] = [];
      if (insightsRes.status === "fulfilled") setData(insightsRes.value);
      else errs.push(`Program insights: ${(insightsRes.reason as Error).message}`);
      if (predictionsRes.status === "fulfilled") setPredictions(predictionsRes.value);
      else errs.push(`Social post value: ${(predictionsRes.reason as Error).message}`);
      setError(errs.length ? errs.join(" | ") : null);
    })();
  }, [token]);

  return (
    <div className="admin-page">
      <div className="card">
        <div className="admin-header-copy">
          <h1 style={{ marginTop: 0 }}>Social Media Strategy</h1>
          <p className="muted">Observed ROI, predicted post value, and weekly content planning.</p>
        </div>
        {error ? <div className="badge danger">{error}</div> : null}
      </div>

      <div className="row">
        <div className="card tone-aqua" style={{ flex: "1 1 260px" }}>
          <div className="muted">Observed donation value from social</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            {data ? `PHP ${data.socialRoi.totalEstimatedDonationValuePhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "-"}
          </div>
        </div>
        <div className="card tone-peach" style={{ flex: "1 1 260px" }}>
          <div className="muted">Boost spend total</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            {data ? `PHP ${data.socialRoi.totalBoostSpendPhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "-"}
          </div>
        </div>
        <div className="card tone-berry" style={{ flex: "1 1 260px" }}>
          <div className="muted">Predicted high-value posts loaded</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{predictions.length}</div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Predicted top-value content</h2>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Post</th>
                <th>Platform</th>
                <th>Predicted value</th>
                <th>Value band</th>
                <th>Topic / CTA</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((post) => (
                <tr key={post.postId}>
                  <td data-label="Post" style={{ fontWeight: 700 }}>
                    #{post.postId} {post.postType}
                    {post.campaignName ? <span className="muted"> · {post.campaignName}</span> : null}
                  </td>
                  <td data-label="Platform" className="muted">{post.platform}</td>
                  <td data-label="Predicted value">
                    PHP {post.predictedValuePhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td data-label="Value band"><span className="badge">{post.valueBand ?? "Review"}</span></td>
                  <td data-label="Topic / CTA" className="muted">
                    {[post.contentTopic, post.callToActionType].filter(Boolean).join(" / ") || "-"}
                  </td>
                </tr>
              ))}
              {predictions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    Import `post_donation_value` to rank content before the next campaign sprint.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Observed top converting post patterns</h2>
        <ul className="muted admin-plain-list">
          <li>Use survivor-progress stories to convert attention into intent.</li>
          <li>Match the donation ask to one clear campaign purpose instead of broad generic messaging.</li>
          <li>Boost only the posts that already show referral traction or strong predicted value.</li>
        </ul>
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
              {(data?.socialRoi.topPosts ?? []).map((p) => (
                <tr key={p.postId}>
                  <td data-label="Post">#{p.postId} {p.postType}</td>
                  <td data-label="Platform" className="muted">{p.platform}</td>
                  <td data-label="Campaign" className="muted">{p.campaignName ?? "General"}</td>
                  <td data-label="Referrals">{p.referrals}</td>
                  <td data-label="Observed value">PHP {p.estimatedValuePhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
              {!data?.socialRoi.topPosts?.length ? (
                <tr><td colSpan={5} className="muted">No observed social conversion rows available yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Content pillars coach</h2>
        <p className="muted">Keep one story, one concrete need, and one gratitude proof point in every weekly content cycle.</p>
        <div className="row">
          <label style={{ display: "grid", gap: 6, flex: "1 1 240px" }}>
            <span className="muted">Story post idea</span>
            <input className="input" value={storyTheme} onChange={(e) => setStoryTheme(e.target.value)} />
          </label>
          <label style={{ display: "grid", gap: 6, flex: "1 1 240px" }}>
            <span className="muted">Need post ask</span>
            <input className="input" value={needItem} onChange={(e) => setNeedItem(e.target.value)} />
          </label>
          <label style={{ display: "grid", gap: 6, flex: "1 1 240px" }}>
            <span className="muted">Gratitude focus</span>
            <input className="input" value={gratitudeFocus} onChange={(e) => setGratitudeFocus(e.target.value)} />
          </label>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <div className="card tone-aqua" style={{ boxShadow: "none", flex: "1 1 220px" }}>
            <strong>Monday · Story</strong>
            <div className="muted">{storyTheme}</div>
          </div>
          <div className="card tone-peach" style={{ boxShadow: "none", flex: "1 1 220px" }}>
            <strong>Wednesday · Need</strong>
            <div className="muted">{needItem}</div>
          </div>
          <div className="card tone-berry" style={{ boxShadow: "none", flex: "1 1 220px" }}>
            <strong>Friday · Gratitude</strong>
            <div className="muted">{gratitudeFocus}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Channel conversion compare</h2>
        {(() => {
          const rows = data?.socialRoi.topPosts ?? [];
          const byPlatform = new Map<string, { referrals: number; value: number }>();
          for (const row of rows) {
            const current = byPlatform.get(row.platform) ?? { referrals: 0, value: 0 };
            current.referrals += row.referrals;
            current.value += row.estimatedValuePhp;
            byPlatform.set(row.platform, current);
          }
          const ranked = [...byPlatform.entries()].sort((a, b) => b[1].value - a[1].value);
          const top = ranked[0];
          return (
            <>
              <ul className="trust-list muted">
                {ranked.map(([platform, value]) => (
                  <li key={platform}>
                    {platform}: PHP {value.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} estimated value and {value.referrals} referrals
                  </li>
                ))}
                {ranked.length === 0 ? <li>No channel comparison rows yet.</li> : null}
              </ul>
              {top ? (
                <div className="badge ok" style={{ marginTop: 8 }}>
                  Recommendation: lead next week with {top[0]}, then repurpose the winning creative into the second-best channel.
                </div>
              ) : null}
            </>
          );
        })()}
      </div>
    </div>
  );
}
