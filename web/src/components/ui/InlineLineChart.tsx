import React from "react";

export type InlineLineDatum = { label: string; value: number };

export function InlineLineChart(props: {
  data: InlineLineDatum[];
  valueFormatter?: (v: number) => string;
  showLegend?: boolean;
}) {
  const { data } = props;
  const fmt = props.valueFormatter ?? ((v: number) => String(v));
  const showLegend = props.showLegend ?? true;

  if (data.length === 0) {
    return <div className="muted">No trend data yet.</div>;
  }

  const width = 520;
  const height = 180;
  const paddingLeft = 64;
  const paddingRight = 18;
  const paddingTop = 18;
  const paddingBottom = 30;
  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : 0;
  const ticks = [max, max / 2, 0];

  const points = data.map((d, idx) => {
    const x = paddingLeft + idx * stepX;
    const y = paddingTop + (1 - d.value / max) * innerHeight;
    return { ...d, x, y };
  });

  const path = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${path} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Trend chart" style={{ width: "100%", height: "auto" }}>
        <defs>
          <linearGradient id="lineChartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(36,114,125,0.25)" />
            <stop offset="100%" stopColor="rgba(36,114,125,0.02)" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((ratio) => {
          const y = paddingTop + ratio * innerHeight;
          return (
            <line
              key={ratio}
              x1={paddingLeft}
              x2={width - paddingRight}
              y1={y}
              y2={y}
              stroke="rgba(136,176,168,0.28)"
              strokeWidth="1"
            />
          );
        })}

        {ticks.map((tick, idx) => {
          const y = paddingTop + (idx / (ticks.length - 1)) * innerHeight;
          return (
            <text
              key={tick}
              x={paddingLeft - 10}
              y={y + 4}
              textAnchor="end"
              fontSize="11"
              fill="var(--muted)"
            >
              {fmt(tick)}
            </text>
          );
        })}

        <path d={areaPath} fill="url(#lineChartFill)" />
        <path d={path} fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

        {points.map((p) => (
          <g key={p.label}>
            <circle cx={p.x} cy={p.y} r="4.5" fill="var(--brand)" stroke="white" strokeWidth="2" />
          </g>
        ))}

        {points.map((p) => (
          <text
            key={`${p.label}-label`}
            x={p.x}
            y={height - 10}
            textAnchor="middle"
            fontSize="11"
            fill="var(--muted)"
          >
            {p.label}
          </text>
        ))}
      </svg>

      {showLegend ? (
        <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
          {data.map((d) => (
            <span key={`${d.label}-legend`} className="badge">
              {d.label}: {fmt(d.value)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
