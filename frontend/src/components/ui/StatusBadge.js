/**
 * Standardized status badge component for consistent post status display
 * Supports: published, draft, scheduled, archived
 */

import React from "react";

const StatusBadge = ({ status, className = "" }) => {
  const styles = {
    published: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-100",
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100",
    archived: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-100",
  };

  const labels = {
    published: "Published",
    draft: "Draft",
    scheduled: "Scheduled",
    archived: "Archived",
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft} ${className}`}>
      {labels[status] || status}
    </span>
  );
};

export default StatusBadge;
