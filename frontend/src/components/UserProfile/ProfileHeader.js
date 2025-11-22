import { formatDate, roleColors, statusColors } from "./ProfileUtils";

export default function ProfileHeader({
  user,
  comprehensiveData,
  profileCompletion,
  isEditing,
  onEditClick,
  onSaveClick,
  onCancelClick,
  saving,
  canEdit = true,
}) {
  const userData = comprehensiveData?.user;
  const normalizedStatus = (userData?.status || "active").toLowerCase();

  const renderStatusBadge = () => (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
        statusColors[normalizedStatus] || statusColors.active
      }`}
    >
      {normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)}
    </span>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Header gradient */}
      <div className="h-32 bg-gradient-to-r from-red-600 to-red-700 relative">
        <div className="absolute inset-0 bg-black/10"></div>
      </div>

      {/* Profile Picture Section */}
      <div className="relative px-6 pb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-16 mb-6">
          <div className="relative group">
            {userData?.profile_picture || user?.photoURL ? (
              <img
                src={userData?.profile_picture || user?.photoURL}
                alt={userData?.name || "User"}
                className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 object-cover shadow-xl"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/default-profile.png";
                }}
              />
            ) : (
              <div className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-4xl font-bold shadow-xl">
                {userData?.name?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
          </div>

          <div className="sm:ml-6 mt-4 sm:mt-0 text-center sm:text-left flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {userData?.name || "User"}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2 justify-center sm:justify-start">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                  roleColors[userData?.role] || roleColors.applicant
                }`}
              >
                {userData?.role || "User"}
              </span>
              {renderStatusBadge()}
            </div>
          </div>

          {/* Edit/Save/Cancel Buttons */}
          {canEdit && (
            <div className="mt-4 sm:mt-0">
              {!isEditing ? (
                <button
                  onClick={onEditClick}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  <span>Edit Profile</span>
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={onSaveClick}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                    <span>Save</span>
                  </button>
                  <button
                    onClick={onCancelClick}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    <span>Cancel</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Account Information Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center md:text-left">
            <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
            <p className="text-gray-900 dark:text-white font-medium">
              {userData?.email || "N/A"}
            </p>
          </div>
          <div className="text-center md:text-left">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Member Since
            </p>
            <p className="text-gray-900 dark:text-white font-medium">
              {formatDate(userData?.date_added)}
            </p>
          </div>
          <div className="text-center md:text-left">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Profile Completion
            </p>
            <div className="mt-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-red-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${profileCompletion}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[3rem]">
                  {profileCompletion}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
