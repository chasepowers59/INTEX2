import React from "react";

export type InlineBarDatum = { label: string; value: number };

export function InlineBarChart(props: { data: InlineBarDatum[]; valueFormatter?: (v: number) => string }) {
  const max = props.data.length ? Math.max(...props.data.map((d) => d.value), 0) : 0;
  const fmt = props.valueFormatter ?? ((v: number) => String(v));

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {props.data.map((d) => {
        const pct = max > 0 ? Math.round((d.value / max) * 100) : 0;
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

