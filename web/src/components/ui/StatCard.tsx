import React from "react";

export function StatCard(props: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "brand" | "ok" | "warn" | "danger";
}) {
  const toneClass = props.tone ? `tone-${props.tone}` : "";

  return (
    <div className={`card stat ${toneClass}`}>
      <div className="muted" style={{ fontSize: 12 }}>
        {props.label}
      </div>
      <div className="stat-value">{props.value}</div>
      {props.hint ? (
        <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
          {props.hint}
        </div>
      ) : null}
    </div>
  );
}

