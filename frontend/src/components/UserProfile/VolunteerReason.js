export default function VolunteerReason({ volunteerInfo, isEditing, editedData, onChange }) {
  if (!volunteerInfo && !isEditing) return null;

  const reason = isEditing && editedData?.volunteer_reason !== undefined
    ? editedData.volunteer_reason
    : volunteerInfo?.volunteer_reason || "";

  const frequency = isEditing && editedData?.volunteer_frequency !== undefined
    ? editedData.volunteer_frequency
    : volunteerInfo?.volunteer_frequency || "";

  const handleChange = (field, value) => {
    if (onChange) {
      onChange({ ...editedData, [field]: value });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <svg
          className="w-5 h-5 text-red-600 dark:text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        Volunteer Motivation
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Reason for Volunteering
          </label>
          {isEditing ? (
            <textarea
              value={reason}
              onChange={(e) => handleChange("volunteer_reason", e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
              placeholder="Share your motivation for volunteering with Bagani..."
            />
          ) : (
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {reason || "Not provided"}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Volunteer Frequency
          </label>
          {isEditing ? (
            <select
              value={frequency}
              onChange={(e) => handleChange("volunteer_frequency", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select frequency...</option>
              <option value="Always">Always (daily)</option>
              <option value="Often">Often (3 or more times a week)</option>
              <option value="Seldom">Seldom (3 times a month)</option>
              <option value="Rarely">Rarely (once every few months)</option>
            </select>
          ) : (
            <p className="text-gray-700 dark:text-gray-300">
              {frequency || "Not specified"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
