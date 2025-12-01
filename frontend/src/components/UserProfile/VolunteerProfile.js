export default function VolunteerProfile({ volunteerInfo, volunteerRoles, availableDays, isEditing, editedVolunteerInfo, editedRoles, editedDays, onVolunteerInfoChange, onRolesChange, onDaysChange }) {
  // Available role options
  const roleOptions = [
    "Events & Sponsorships",
    "Communications",
    "Clinic Operations",
    "Organization Development",
    "Information Technology",
    "Other",
  ];

  const currentRoles = isEditing && editedRoles !== undefined
    ? editedRoles
    : (volunteerRoles || []).map(r => r.role_name);

  // Volunteer reason is always read-only from volunteerInfo
  const reason = volunteerInfo?.volunteer_reason || "";

  // Frequency can be edited
  const frequency = isEditing && editedVolunteerInfo?.volunteer_frequency !== undefined
    ? editedVolunteerInfo.volunteer_frequency
    : volunteerInfo?.volunteer_frequency || "";

  const handleRoleToggle = (roleName) => {
    if (!onRolesChange) return;

    if (currentRoles.includes(roleName)) {
      onRolesChange(currentRoles.filter(r => r !== roleName));
    } else {
      onRolesChange([...currentRoles, roleName]);
    }
  };

  const handleFrequencyChange = (value) => {
    if (onVolunteerInfoChange) {
      onVolunteerInfoChange({ ...editedVolunteerInfo, volunteer_frequency: value });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
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
        Volunteer Application Details
      </h3>

      <div className="space-y-6">
        {/* Volunteer Motivation Section */}
        <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason for Volunteering
              </label>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                {reason || "Not provided"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Volunteer Frequency
              </label>
              {isEditing ? (
                <select
                  value={frequency}
                  onChange={(e) => handleFrequencyChange(e.target.value)}
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
        {/* Preferred Volunteer Roles */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Preferred Volunteer Roles
          </label>
          {isEditing ? (
            <div className="space-y-2">
              {roleOptions.map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={currentRoles.includes(role)}
                    onChange={() => handleRoleToggle(role)}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{role}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {currentRoles.length > 0 ? (
                currentRoles.map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                  >
                    {role}
                  </span>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No roles selected</p>
              )}
            </div>
          )}
        </div>
      </div>
  );
}
