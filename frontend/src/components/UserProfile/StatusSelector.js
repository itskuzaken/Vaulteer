export default function StatusSelector({
  statuses,
  currentStatus,
  selectedStatus,
  onStatusChange,
  disabled,
  allowedStatuses = [],
  getStatusDescription,
}) {
  const getStatusColor = (statusName) => {
    const normalized = (statusName || "").toLowerCase();
    switch (normalized) {
      case "approved":
        return "text-green-600 dark:text-green-400 border-green-300 dark:border-green-700";
      case "rejected":
        return "text-red-600 dark:text-red-400 border-red-300 dark:border-red-700";
      case "interview_scheduled":
        return "text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700";
      case "under_review":
        return "text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-700";
      case "pending":
        return "text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700";
      default:
        return "text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700";
    }
  };

  const formatStatusLabel = (status) => {
    if (!status) return "";
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getStatusIcon = (statusName) => {
    const normalized = (statusName || "").toLowerCase();
    switch (normalized) {
      case "approved":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "rejected":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "interview_scheduled":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "under_review":
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path
              fillRule="evenodd"
              d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        Change Application Status
      </h4>
      <div className="space-y-2">
        {statuses.map((status) => {
          const isSelected = selectedStatus === status.status_name;
          const isCurrent =
            currentStatus?.toLowerCase() === status.status_name.toLowerCase();
          const isAllowed = allowedStatuses.includes(status.status_name);
          const isDisabled = disabled || !isAllowed;
          const colorClasses = getStatusColor(status.status_name);
          const description = getStatusDescription
            ? getStatusDescription(status.status_name)
            : null;

          return (
            <label
              key={status.status_id}
              className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${
                isSelected
                  ? `${colorClasses} bg-opacity-10 dark:bg-opacity-20`
                  : isDisabled
                  ? "border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer"
              }`}
            >
              <input
                type="radio"
                name="application-status"
                value={status.status_name}
                checked={isSelected}
                onChange={(e) => !isDisabled && onStatusChange(e.target.value)}
                disabled={isDisabled}
                className="mt-1 w-4 h-4 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className={colorClasses}>
                    {getStatusIcon(status.status_name)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {formatStatusLabel(status.status_name)}
                    </div>
                    {isCurrent && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        (Current Status)
                      </span>
                    )}
                  </div>
                </div>
                {description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {description}
                  </p>
                )}
                {!isAllowed && !isCurrent && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Not available from current status
                  </p>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
