export default function ActivitySummary({ activitySummary }) {
  if (!activitySummary) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Activity Summary
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 rounded-lg p-4 text-center border border-red-200 dark:border-red-800">
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">
            {activitySummary.total_actions || 0}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
            Total Actions
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-lg p-4 text-center border border-green-200 dark:border-green-800">
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {activitySummary.this_month || 0}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
            This Month
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-lg p-4 text-center border border-blue-200 dark:border-blue-800">
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {activitySummary.this_week || 0}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
            This Week
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 rounded-lg p-4 text-center border border-purple-200 dark:border-purple-800">
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {activitySummary.today || 0}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
            Today
          </p>
        </div>
      </div>
    </div>
  );
}
