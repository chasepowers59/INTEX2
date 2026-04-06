import React from "react";

export type InlineBarDatum = { label: string; value: number };

export function InlineBarChart(props: { data: InlineBarDatum[]; valueFormatter?: (v: number) => string }) {
  const max = Math.max(1, ...props.data.map((d) => d.value));
  const fmt = props.valueFormatter ?? ((v: number) => String(v));

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {props.data.map((d) => {
        const pct = Math.round((d.value / max) * 100);
        return (
          <div key={d.label} className="bar-row">
            <div className="bar-label muted">{d.label}</div>
            <div className="bar-track" aria-hidden="true">
              <div className="bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="bar-value">{fmt(d.value)}</div>
          </div>
        );
      })}
    </div>
  );
}

