import React from "react";

const MAP = {
  active: "badge badge-status-active",
  inactive: "badge badge-status-inactive",
  pending: "badge badge-status-pending",
  rejected: "badge badge-status-rejected",
};

export function Badge({ status, children }) {
  const cls = MAP[status] || "badge badge-status-inactive";
  return <span className={cls}>{children || status}</span>;
}
