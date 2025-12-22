"use client";

const PERIOD_OPTIONS = [
  { key: 'monthly', label: '30 days' },
  { key: 'all', label: 'All time' },
];

export default function FiltersBar({ period, setPeriod }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-1 rounded-full">
        {PERIOD_OPTIONS.map((option) => (
          <button key={option.key} type="button" onClick={() => setPeriod(option.key)} className={`text-[0.65rem] sm:text-xs font-semibold px-2 py-1 rounded-full ${period === option.key ? 'bg-white dark:bg-gray-900 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
