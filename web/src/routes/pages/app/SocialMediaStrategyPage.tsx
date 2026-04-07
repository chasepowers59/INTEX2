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

export function SocialMediaStrategyPage() {
  const auth = useAuth();
  const [data, setData] = useState<ProgramInsights | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await apiFetch<ProgramInsights>("/api/analytics/program-insights", { token: auth.token ?? undefined });
        setData(d);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [auth.token]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Social media strategy center</h1>
        <p className="muted">
          Use these insights to decide what to post, where to post, and which campaigns convert to meaningful donor action.
        </p>
        {error ? <div className="badge danger">{error}</div> : null}
      </div>

      <div className="row">
        <div className="card tone-aqua" style={{ flex: "1 1 260px" }}>
          <div className="muted">Estimated donation value from social</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            {data ? `₱${data.socialRoi.totalEstimatedDonationValuePhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
          </div>
        </div>
        <div className="card tone-peach" style={{ flex: "1 1 260px" }}>
          <div className="muted">Boost spend total</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            {data ? `₱${data.socialRoi.totalBoostSpendPhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Top converting post patterns</h2>
        <ul className="muted trust-list">
          <li>Prioritize impact story format and clear campaign intent.</li>
          <li>Promote high-referral posts with moderate boost rather than broad untargeted spend.</li>
          <li>Repurpose top-performing themes across platforms weekly.</li>
        </ul>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Post</th>
                <th>Platform</th>
                <th>Campaign</th>
                <th>Referrals</th>
                <th>Estimated value</th>
              </tr>
            </thead>
            <tbody>
              {(data?.socialRoi.topPosts ?? []).map((p) => (
                <tr key={p.postId}>
                  <td data-label="Post">#{p.postId} {p.postType}</td>
                  <td data-label="Platform" className="muted">{p.platform}</td>
                  <td data-label="Campaign" className="muted">{p.campaignName ?? "General"}</td>
                  <td data-label="Referrals">{p.referrals}</td>
                  <td data-label="Estimated value">₱{p.estimatedValuePhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
              {!data?.socialRoi.topPosts?.length ? (
                <tr><td colSpan={5} className="muted">No social conversion rows available yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
