"use client";

import LeaderboardRow from "./LeaderboardRow";

export default function LeaderboardList({ entries = [], loading = false, total = 0, page = 1, setPage, perPage = 50 }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
      <div className="overflow-auto">
        <ul className="flex flex-col gap-3" role="list">
          {loading ? (
            Array.from({ length: perPage }).map((_, i) => (
              <li key={i} className="p-3 h-12 rounded-md bg-gray-50 dark:bg-gray-800 animate-pulse" />
            ))
          ) : entries.length ? (
            entries.map((entry) => (
              <LeaderboardRow key={`${entry.user_id}-${entry.rank}`} entry={entry} />
            ))
          ) : (
            <li className="p-6 text-center text-gray-500 dark:text-gray-400">No additional leaders yet.</li>
          )}
        </ul>
      </div>
      {/* Simple pagination controls */}
      <div className="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <div>{Math.min(total, (page-1)*perPage + 1)}–{Math.min(total, page*perPage)} of {total}</div>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage(Math.max(1, page-1))} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 disabled:opacity-50">Prev</button>
          <button type="button" disabled={(page*perPage) >= total} onClick={() => setPage(page+1)} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}
