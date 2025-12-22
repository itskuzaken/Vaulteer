"use client";

import LeaderboardRow from "./LeaderboardRow";

export default function LeaderboardList({ entries = [], loading = false, total = 0, page = 1, setPage, perPage = 50 }) {
  return (
      <div className="overflow-auto">
        <ul className="flex flex-col gap-3" role="list">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => ( // Use a fixed number like 6 for the skeleton to avoid huge layout shifts
              <li 
                key={i} 
                className="flex items-center gap-3 sm:gap-4 p-3 rounded-2xl border-[1.5px] border-gray-200 dark:border-gray-800 animate-pulse"
              >
                {/* Rank Skeleton */}
                <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex-shrink-0" />
                
                {/* Avatar Skeleton */}
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gray-100 dark:bg-gray-800 flex-shrink-0" />
                
                {/* User Info Skeleton */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-3.5 sm:h-4 w-1/3 bg-gray-100 dark:bg-gray-800 rounded" />
                  <div className="h-2.5 sm:h-3 w-1/4 bg-gray-50 dark:bg-gray-800/50 rounded" />
                </div>
                
                {/* Points Skeleton */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="h-4 sm:h-5 w-12 bg-gray-100 dark:bg-gray-800 rounded" />
                  <div className="h-2 w-8 bg-gray-50 dark:bg-gray-800/50 rounded" />
                </div>
              </li>
            ))
          ) : entries.length ? (
            entries.slice(0, 50).map((entry) => (
              <LeaderboardRow key={`${entry.user_id}-${entry.rank}`} entry={entry} />
            ))
          ) : (
            <li className="p-6 text-center text-gray-500 dark:text-gray-400">No additional leaders yet.</li>
          )}
        </ul>
      </div>
  );
}