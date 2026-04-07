import React from "react";

export function KeyValueGrid(props: { items: { key: string; value: React.ReactNode }[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(12, 1fr)",
        gap: 10,
        marginTop: 10,
      }}
    >
      {props.items.map((x) => (
        <div
          key={x.key}
          className="card"
          style={{
            gridColumn: "span 4",
            boxShadow: "none",
            background: "var(--panel2)",
          }}
        >
          <div className="muted" style={{ fontSize: 12 }}>
            {x.key}
          </div>
          <div style={{ fontWeight: 900, marginTop: 6 }}>{x.value}</div>
        </div>
      ))}
    </div>
  );
}

