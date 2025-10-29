export default function Achievements({ achievements }) {
  if (!achievements || achievements.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Achievements
      </h3>

      <div className="grid gap-4 md:grid-cols-2">
        {achievements.map((achievement, index) => (
          <div
            key={`achievement-${achievement.achievement_id}-${index}`}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-gradient-to-br from-yellow-50/50 to-amber-50/50 dark:from-yellow-900/10 dark:to-amber-900/10"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {achievement.achievement_name}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {achievement.achievement_description}
                </p>
                
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs capitalize">
                    {achievement.achievement_category}
                  </span>
                  {achievement.achievement_points > 0 && (
                    <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded text-xs font-medium">
                      {achievement.achievement_points} pts
                    </span>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Earned: {new Date(achievement.earned_date).toLocaleDateString()}
                  {achievement.awarded_by_name && (
                    <span className="ml-2">
                      • Awarded by {achievement.awarded_by_name}
                    </span>
                  )}
                </div>
                
                {achievement.notes && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">
                    {achievement.notes}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
