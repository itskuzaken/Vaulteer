export default function StatusTimeline({ history, loading }) {
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatStatusLabel = (status) => {
    if (!status) return "Unknown";
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getStatusIcon = (statusName) => {
    const normalized = (statusName || "").toLowerCase();
    switch (normalized) {
      case "approved":
        return "🟢";
      case "rejected":
        return "🔴";
      case "interview_scheduled":
        return "🔵";
      case "under_review":
        return "🟡";
      case "pending":
        return "⚪";
      default:
        return "⚫";
    }
  };

  const getStatusColor = (statusName) => {
    const normalized = (statusName || "").toLowerCase();
    switch (normalized) {
      case "approved":
        return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
      case "rejected":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      case "interview_scheduled":
        return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
      case "under_review":
        return "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800";
      case "pending":
        return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800";
    }
  };

  const formatInterviewDetails = (details) => {
    if (!details) return null;
    const when = details.display || formatDate(details.atUtc);
    const mode = details.mode === "online" ? "Online" : "Onsite";
    const locationLine =
      details.mode === "online" ? details.link || "Link to follow" : details.location || "Location to follow";
    const duration = details.duration || null;
    const focus = details.focus || null;
    return { when, mode, locationLine, duration, focus };
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Status History
        </h4>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Status History
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          No status changes recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Status History
      </h4>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-gray-200 dark:bg-gray-700"></div>

        {/* Timeline items */}
        <div className="space-y-4">
          {history.map((item, index) => (
            <div key={item.id} className="relative flex gap-4">
              {/* Timeline dot */}
              <div
                className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 ${getStatusColor(
                  item.status_name
                )}`}
              >
                <span className="text-sm">
                  {getStatusIcon(item.status_name)}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div
                  className={`p-3 rounded-lg border ${getStatusColor(
                    item.status_name
                  )}`}
                >
                  <div className="font-semibold text-sm">
                    {formatStatusLabel(item.status_name)}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {formatDate(item.changed_at)}
                    {item.changed_by_name && (
                      <span> • Changed by {item.changed_by_name}</span>
                    )}
                  </div>
                  {item.notes && (
                    <div className="text-xs text-gray-700 dark:text-gray-300 mt-2 p-2 bg-white dark:bg-gray-800 rounded">
                      <span className="font-medium">Note:</span> {item.notes}
                    </div>
                  )}
                  {(() => {
                    const formatted = formatInterviewDetails(
                      item.interview_details
                    );
                    if (!formatted) return null;
                    return (
                      <div className="text-xs text-gray-700 dark:text-gray-300 mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-blue-100 dark:border-blue-800">
                        <div className="font-medium text-blue-700 dark:text-blue-300 mb-1">Interview Details</div>
                        <div className="space-y-1">
                          <div>When: {formatted.when}</div>
                          <div>Mode: {formatted.mode}</div>
                          <div>{formatted.locationLine}</div>
                          {formatted.duration && (
                            <div>Estimated Duration: {formatted.duration}</div>
                          )}
                          {formatted.focus && (
                            <div>Agenda: {formatted.focus}</div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
