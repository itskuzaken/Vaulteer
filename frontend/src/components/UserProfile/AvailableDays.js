import { removeDuplicates } from './ProfileUtils';

export default function AvailableDays({ 
  availableDays, 
  isEditing, 
  editedDays, 
  onChange 
}) {
  const handleDayToggle = (dayId) => {
    const currentDays = editedDays || [];
    const isSelected = currentDays.includes(dayId);
    
    if (isSelected) {
      onChange(currentDays.filter(id => id !== dayId));
    } else {
      onChange([...currentDays, dayId]);
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

  const uniqueAvailableDays = removeDuplicates(availableDays || [], 'day_id');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Available Days
      </h3>

      {isEditing ? (
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Select the days you are available for volunteer activities:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {daysOfWeek.map((day) => {
              const isSelected = (editedDays || []).includes(day.id);
              return (
                <label
                  key={day.id}
                  className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-orange-600 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
                      : 'border-gray-300 dark:border-gray-600 hover:border-orange-400'
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
        </div>
      ) : uniqueAvailableDays.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {uniqueAvailableDays.map((day) => (
            <span
              key={`available-day-${day.day_id}`}
              className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded-lg font-medium"
            >
              {day.day_name}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-sm">No available days set</p>
      )}
    </div>
  );
}
