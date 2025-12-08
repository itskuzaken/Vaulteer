import { formatDate, formatDateForInput } from './ProfileUtils';

export default function PersonalDetails({ profile, isEditing, editedData, onChange }) {
  const handleChange = (field, value) => {
    onChange({ ...editedData, [field]: value });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
      <h3 className="text-lg sm:text-xl font-semibold sm:font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Personal Details
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* First Name */}
        <div>
          <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
            First Name
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedData?.first_name || ''}
              onChange={(e) => handleChange('first_name', e.target.value)}
              className="mt-1 w-full px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm sm:text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[44px]"
              required
            />
          ) : (
            <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium mt-1">
              {profile?.first_name || "N/A"}
            </p>
          )}
        </div>

        {/* Middle Initial */}
        <div>
          <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
            Middle Initial
          </label>
          {isEditing ? (
            <input
              type="text"
              maxLength="1"
              value={editedData?.middle_initial || ''}
              onChange={(e) => handleChange('middle_initial', e.target.value.toUpperCase())}
              className="mt-1 w-full px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm sm:text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[44px]"
            />
          ) : (
            <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium mt-1">
              {profile?.middle_initial || "N/A"}
            </p>
          )}
        </div>

        {/* Last Name */}
        <div>
          <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
            Last Name
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedData?.last_name || ''}
              onChange={(e) => handleChange('last_name', e.target.value)}
              className="mt-1 w-full px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm sm:text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[44px]"
              required
            />
          ) : (
            <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium mt-1">
              {profile?.last_name || "N/A"}
            </p>
          )}
        </div>

        {/* Nickname */}
        <div>
          <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
            Nickname
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedData?.nickname || ''}
              onChange={(e) => handleChange('nickname', e.target.value)}
              className="mt-1 w-full px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm sm:text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[44px]"
            />
          ) : (
            <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium mt-1">
              {profile?.nickname || "N/A"}
            </p>
          )}
        </div>

        {/* Birthdate */}
        <div>
          <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
            Birthdate
          </label>
          {isEditing ? (
            <input
              type="date"
              value={formatDateForInput(editedData?.birthdate)}
              onChange={(e) => handleChange('birthdate', e.target.value)}
              className="mt-1 w-full px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm sm:text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[44px]"
              required
            />
          ) : (
            <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium mt-1">
              {formatDate(profile?.birthdate)}
            </p>
          )}
        </div>

        {/* Gender */}
        <div>
          <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
            Gender
          </label>
          {isEditing ? (
            <select
              value={editedData?.gender || ''}
              onChange={(e) => handleChange('gender', e.target.value)}
              className="mt-1 w-full px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm sm:text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[44px]"
              required
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          ) : (
            <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium mt-1">
              {profile?.gender || "N/A"}
            </p>
          )}
        </div>

        {/* Mobile Number */}
        <div>
          <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
            Mobile Number
          </label>
          {isEditing ? (
            <input
              type="tel"
              value={editedData?.mobile_number || ''}
              onChange={(e) => {
                // Allow only digits and an optional leading '+'; remove letters
                let v = e.target.value;
                const hasPlus = v.startsWith('+');
                // Remove everything except digits
                const digitsOnly = v.replace(/[^0-9]/g, '');
                if (hasPlus) {
                  // For plus-prefixed numbers: +639XXXXXXXXX (13 chars total)
                  const limited = digitsOnly.slice(0, 12); // '63' + 10 digits
                  handleChange('mobile_number', `+${limited}`.slice(0, 13));
                } else {
                  // Local numbers up to 11 digits: 09XXXXXXXXX
                  const limited = digitsOnly.slice(0, 11);
                  handleChange('mobile_number', limited);
                }
              }}
              inputMode="tel"
              pattern="^\+?\d*$"
              maxLength={13}
              placeholder="09123456789 or +639123456789"
              className="mt-1 w-full px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm sm:text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[44px]"
              required
            />
          ) : (
            <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium mt-1">
              {profile?.mobile_number || "N/A"}
            </p>
          )}
        </div>

        {/* City */}
        <div>
          <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
            City
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedData?.city || ''}
              onChange={(e) => handleChange('city', e.target.value)}
              className="mt-1 w-full px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm sm:text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[44px]"
              required
            />
          ) : (
            <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium mt-1">
              {profile?.city || "N/A"}
            </p>
          )}
        </div>

        {/* Current Status */}
        <div>
          <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
            Current Status
          </label>
          {isEditing ? (
            <select
              value={editedData?.current_status || ''}
              onChange={(e) => handleChange('current_status', e.target.value)}
              className="mt-1 w-full px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm sm:text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[44px]"
            >
              <option value="">Select Status</option>
              <option value="Student">Student</option>
              <option value="Employed">Employed</option>
              <option value="Unemployed">Unemployed</option>
              <option value="Self-employed">Self-employed</option>
            </select>
          ) : (
            <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium mt-1">
              {profile?.current_status || "N/A"}
            </p>
          )}
        </div>
      </div>

      {/* Social Media Links */}
      {(profile?.facebook || profile?.twitter || profile?.instagram || profile?.tiktok || isEditing) && (
        <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Social Media
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Facebook */}
            <div>
              <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                Facebook
              </label>
              {isEditing ? (
                <input
                  type="url"
                  value={editedData?.facebook || ''}
                  onChange={(e) => handleChange('facebook', e.target.value)}
                  placeholder="https://facebook.com/username"
                  className="mt-1 w-full px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm sm:text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[44px]"
                />
              ) : profile?.facebook ? (
                <a
                  href={profile.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline text-xs sm:text-sm mt-1 block break-all"
                >
                  {profile.facebook}
                </a>
              ) : (
                <p className="text-gray-500 text-xs sm:text-sm mt-1">Not provided</p>
              )}
            </div>

            {/* Instagram */}
            <div>
              <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                Instagram
              </label>
              {isEditing ? (
                <input
                  type="url"
                  value={editedData?.instagram || ''}
                  onChange={(e) => handleChange('instagram', e.target.value)}
                  placeholder="https://instagram.com/username"
                  className="mt-1 w-full px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm sm:text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[44px]"
                />
              ) : profile?.instagram ? (
                <a
                  href={profile.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-600 dark:text-pink-400 hover:underline text-xs sm:text-sm mt-1 block break-all"
                >
                  {profile.instagram}
                </a>
              ) : (
                <p className="text-gray-500 text-xs sm:text-sm mt-1">Not provided</p>
              )}
            </div>

            {/* Twitter */}
            <div>
              <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                Twitter
              </label>
              {isEditing ? (
                <input
                  type="url"
                  value={editedData?.twitter || ''}
                  onChange={(e) => handleChange('twitter', e.target.value)}
                  placeholder="https://twitter.com/username"
                  className="mt-1 w-full px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm sm:text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[44px]"
                />
              ) : profile?.twitter ? (
                <a
                  href={profile.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 dark:text-blue-300 hover:underline text-xs sm:text-sm mt-1 block break-all"
                >
                  {profile.twitter}
                </a>
              ) : (
                <p className="text-gray-500 text-xs sm:text-sm mt-1">Not provided</p>
              )}
            </div>

            {/* TikTok */}
            <div>
              <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                TikTok
              </label>
              {isEditing ? (
                <input
                  type="url"
                  value={editedData?.tiktok || ''}
                  onChange={(e) => handleChange('tiktok', e.target.value)}
                  placeholder="https://tiktok.com/@username"
                  className="mt-1 w-full px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm sm:text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[44px]"
                />
              ) : profile?.tiktok ? (
                <a
                  href={profile.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-900 dark:text-white hover:underline text-xs sm:text-sm mt-1 block break-all"
                >
                  {profile.tiktok}
                </a>
              ) : (
                <p className="text-gray-500 text-xs sm:text-sm mt-1">Not provided</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

