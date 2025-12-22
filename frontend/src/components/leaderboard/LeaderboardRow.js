"use client";

import { getAvatarUrl, formatName, getRankIconStyle, getRowStyle } from "./utils";

export default function LeaderboardRow({ entry }) {
  return (
    <li
      key={`${entry.user_id || entry.email}-${entry.rank}`}
      className={`relative flex items-center gap-3 sm:gap-4 p-3 rounded-2xl border-[1.5px] transition-all duration-200 ${getRowStyle(entry.rank)}`}
      role="listitem"
    >
      <div className={`w-6 h-6 flex flex-shrink-0 items-center justify-center rounded-full text-xs font-bold border ${getRankIconStyle(entry.rank)}`}>
        {entry.rank}
      </div>

      <div className="relative flex-shrink-0">
        <img
          src={getAvatarUrl(entry)}
          alt={formatName(entry)}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover bg-gray-100 dark:bg-gray-800 ring-2 ring-white dark:ring-gray-900"
          onError={(e) => {
            e.currentTarget.onerror = null;
            const fallbackName = entry?.name || entry?.email || "User";
            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=D32F2F&color=fff&size=128`;
          }}
        />
        <div className="absolute -bottom-1 -right-1 z-10 flex items-center justify-center">
          <span className="bg-gray-900 dark:bg-black text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-gray-900 shadow-sm">
            Lvl {entry.current_level ?? 1}
          </span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">{formatName(entry)}</p>
        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">{entry.email || "No email"}</p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-none tabular-nums">{entry.points?.toLocaleString() ?? 0}</p>
        <p className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500 mt-0.5">Points</p>
      </div>
    </li>
  );
}