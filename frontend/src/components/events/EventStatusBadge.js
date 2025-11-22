export default function EventStatusBadge({ status }) {
  const getStatusConfig = (status) => {
    const normalized = status?.toLowerCase();

    switch (normalized) {
      case "draft":
        return {
          label: "Draft",
          className:
            "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
        };
      case "published":
        return {
          label: "Published",
          className:
            "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        };
      case "ongoing":
        return {
          label: "Ongoing",
          className:
            "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
        };
      case "completed":
        return {
          label: "Completed",
          className:
            "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
        };
      case "cancelled":
        return {
          label: "Cancelled",
          className:
            "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
        };
      case "archived":
        return {
          label: "Archived",
          className:
            "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
        };
      case "postponed":
        return {
          label: "Postponed",
          className:
            "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-200",
        };
      default:
        return {
          label: status,
          className:
            "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span
      className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}
