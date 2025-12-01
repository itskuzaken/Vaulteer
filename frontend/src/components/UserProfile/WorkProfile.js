import { removeDuplicates } from './ProfileUtils';

export default function WorkProfile({ 
  workProfile, 
  workingDays, 
  isEditing, 
  editedData, 
  editedDays, 
  onChange, 
  onDaysChange 
}) {
  const handleChange = (field, value) => {
    onChange({ ...editedData, [field]: value });
  };

  const handleDayToggle = (dayId) => {
    const currentDays = editedDays || [];
    const isSelected = currentDays.includes(dayId);
    
    if (isSelected) {
      onDaysChange(currentDays.filter(id => id !== dayId));
    } else {
      onDaysChange([...currentDays, dayId]);
    }
  };

  const daysOfWeek = [
    { id: 1, name: 'Monday' },
    { id: 2, name: 'Tuesday' },
    { id: 3, name: 'Wednesday' },
    { id: 4, name: 'Thursday' },
    { id: 5, name: 'Friday' },
    { id: 6, name: 'Saturday' },
    { id: 7, name: 'Sunday' },
  ];

  const uniqueWorkingDays = removeDuplicates(workingDays || [], 'day_id');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
      <h3 className="text-lg sm:text-xl font-semibold sm:font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Work Profile
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Position */}
        <div>
          <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
            Position
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedData?.position || ''}
              onChange={(e) => handleChange('position', e.target.value)}
              placeholder="Job Title"
              className="mt-1 w-full px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm sm:text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[44px]"
            />
          ) : (
            <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium mt-1">
              {workProfile?.position || "N/A"}
            </p>
          )}
        </div>

        {/* Industry */}
        <div>
          <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
            Industry
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedData?.industry || ''}
              onChange={(e) => handleChange('industry', e.target.value)}
              placeholder="Industry Type"
              className="mt-1 w-full px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm sm:text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[44px]"
            />
          ) : (
            <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium mt-1">
              {workProfile?.industry || "N/A"}
            </p>
          )}
        </div>

        {/* Company */}
        <div>
          <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
            Company
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedData?.company || ''}
              onChange={(e) => handleChange('company', e.target.value)}
              placeholder="Company Name"
              className="mt-1 w-full px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm sm:text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[44px]"
            />
          ) : (
            <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium mt-1">
              {workProfile?.company || "N/A"}
            </p>
          )}
        </div>

        {/* Work Shift */}
        <div>
          <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
            Work Shift
          </label>
          {isEditing ? (
            <select
              value={editedData?.work_shift || ''}
              onChange={(e) => handleChange('work_shift', e.target.value)}
              className="mt-1 w-full px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm sm:text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[44px]"
            >
              <option value="">Select Shift</option>
              <option value="Day Shift">Day Shift</option>
              <option value="Night Shift">Night Shift</option>
              <option value="Rotating Shift">Rotating Shift</option>
              <option value="Flexible">Flexible</option>
            </select>
          ) : (
            <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium mt-1">
              {workProfile?.work_shift || "N/A"}
            </p>
          )}
        </div>

        {/* Skills */}
        <div className="md:col-span-2">
          <label className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
            Skills
          </label>
          {isEditing ? (
            <textarea
              value={editedData?.work_other_skills || ''}
              onChange={(e) => handleChange('work_other_skills', e.target.value)}
              placeholder="List your professional skills (comma-separated)"
              rows="3"
              className="mt-1 w-full px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm sm:text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent min-h-[44px] resize-none"
            />
          ) : (
            <p className="text-sm sm:text-base text-gray-900 dark:text-white font-medium mt-1">
              {workProfile?.work_other_skills || "N/A"}
            </p>
          )}
        </div>
      </div>

      {/* Working Days */}
      <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
        <label className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-3 block">
          Working Days
        </label>
        
        {isEditing ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {daysOfWeek.map((day) => {
              const isSelected = (editedDays || []).includes(day.id);
              return (
                <label
                  key={day.id}
                  className={`flex items-center justify-center px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 min-h-[44px] cursor-pointer transition-all ${
                    isSelected
                      ? 'border-green-600 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                      : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleDayToggle(day.id)}
                    className="sr-only"
                  />
                  <span className="text-xs sm:text-sm font-medium">{day.name}</span>
                </label>
              );
            })}
          </div>
        ) : uniqueWorkingDays.length > 0 ? (
          <div className="flex flex-wrap gap-2 sm:gap-2">
            {uniqueWorkingDays.map((day) => (
              <span
                key={`working-day-${day.day_id}`}
                className="px-2 sm:px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-xs sm:text-sm"
              >
                {day.day_name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-xs sm:text-sm">No working days set</p>
        )}
      </div>
    </div>
  );
}

