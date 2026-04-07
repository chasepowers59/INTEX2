import React from "react";

export function PaginationControls(props: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (props.totalPages <= 1) return null;
  return (
    <div className="reports-pagination">
      <button className="btn" type="button" disabled={props.page <= 1} onClick={props.onPrev}>
        Previous
      </button>
      <span className="muted">
        Page {props.page} of {props.totalPages}
      </span>
      <button className="btn" type="button" disabled={props.page >= props.totalPages} onClick={props.onNext}>
        Next
      </button>
    </div>
  );
}
