import { removeDuplicates } from './ProfileUtils';

export default function StudentProfile({ 
  studentProfile, 
  schoolDays, 
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

  const uniqueSchoolDays = removeDuplicates(schoolDays || [], 'day_id');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        Student Profile
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* School */}
        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
            School
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedData?.school || ''}
              onChange={(e) => handleChange('school', e.target.value)}
              placeholder="School Name"
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          ) : (
            <p className="text-gray-900 dark:text-white font-medium mt-1">
              {studentProfile?.school || "N/A"}
            </p>
          )}
        </div>

        {/* Course */}
        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Course
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedData?.course || ''}
              onChange={(e) => handleChange('course', e.target.value)}
              placeholder="Course/Program"
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          ) : (
            <p className="text-gray-900 dark:text-white font-medium mt-1">
              {studentProfile?.course || "N/A"}
            </p>
          )}
        </div>

        {/* Expected Graduation */}
        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Expected Graduation
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedData?.graduation || ''}
              onChange={(e) => handleChange('graduation', e.target.value)}
              placeholder="e.g., 2025"
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          ) : (
            <p className="text-gray-900 dark:text-white font-medium mt-1">
              {studentProfile?.graduation || "N/A"}
            </p>
          )}
        </div>

        {/* Skills */}
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Skills & Interests
          </label>
          {isEditing ? (
            <textarea
              value={editedData?.student_other_skills || ''}
              onChange={(e) => handleChange('student_other_skills', e.target.value)}
              placeholder="List your academic skills and interests (comma-separated)"
              rows="3"
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          ) : (
            <p className="text-gray-900 dark:text-white font-medium mt-1">
              {studentProfile?.student_other_skills || "N/A"}
            </p>
          )}
        </div>
      </div>

      {/* School Days */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <label className="text-sm font-semibold text-gray-900 dark:text-white mb-3 block">
          School Days
        </label>
        
        {isEditing ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {daysOfWeek.map((day) => {
              const isSelected = (editedDays || []).includes(day.id);
              return (
                <label
                  key={day.id}
                  className={`flex items-center justify-center px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleDayToggle(day.id)}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">{day.name}</span>
                </label>
              );
            })}
          </div>
        ) : uniqueSchoolDays.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {uniqueSchoolDays.map((day) => (
              <span
                key={`school-day-${day.day_id}`}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm"
              >
                {day.day_name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No school days set</p>
        )}
      </div>
    </div>
  );
}
