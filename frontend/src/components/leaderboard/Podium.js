"use client";

// --- Helper Styles (Synced with LeaderboardCard) ---

// Container Border & Background
function getPodiumStyle(rank) {
  switch (rank) {
    case 1: // Gold
      return "border-yellow-400 dark:border-yellow-600 bg-yellow-50/50 dark:bg-yellow-900/10";
    case 2: // Silver
      return "border-slate-300 dark:border-slate-500 bg-slate-50/50 dark:bg-slate-900/10";
    case 3: // Bronze
      return "border-orange-300 dark:border-orange-600 bg-orange-50/50 dark:bg-orange-900/10";
    default:
      return "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900";
  }
}

// Avatar Ring Color
function getRingStyle(rank) {
  switch (rank) {
    case 1:
      return "ring-yellow-400 dark:ring-yellow-600";
    case 2:
      return "ring-slate-300 dark:ring-slate-500";
    case 3:
      return "ring-orange-300 dark:ring-orange-600";
    default:
      return "ring-gray-200 dark:ring-gray-700";
  }
}

// Rank Label Text Color
function getRankTextStyle(rank) {
  switch (rank) {
    case 1:
      return "text-yellow-700 dark:text-yellow-400";
    case 2:
      return "text-slate-600 dark:text-slate-400";
    case 3:
      return "text-orange-700 dark:text-orange-400";
    default:
      return "text-gray-500";
  }
}

export default function Podium({ entries = [], loading = false }) {
  // Ensure we have objects for the first 3 slots to render placeholders if empty
  // entries are typically sorted [1st, 2nd, 3rd...]
  // We want to visualize as: [2nd, 1st, 3rd]
  const safeEntry = (idx) => entries[idx] || null;
  const arranged = [
    { ...safeEntry(1), fallbackRank: 2 }, // Left: 2nd
    { ...safeEntry(0), fallbackRank: 1 }, // Center: 1st
    { ...safeEntry(2), fallbackRank: 3 }, // Right: 3rd
  ];

  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4 items-end mb-8">
      {arranged.map((entry, i) => {
        const rank = entry.rank || entry.fallbackRank;
        const isCenter = rank === 1;

        return (
          <div
            key={i}
            className={`
              relative flex flex-col items-center p-3 sm:p-4 rounded-2xl border-2 transition-all duration-300
              ${getPodiumStyle(rank)}
              ${isCenter ? "z-10 shadow-lg scale-105 pb-6" : "opacity-90"}
            `}
          >
            {/* Rank Indicator Badge (Top Corner) */}
            <div
              className={`
               absolute -top-3 left-1/2 -translate-x-1/2 
               text-[10px] sm:text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border bg-white dark:bg-gray-900 shadow-sm
               ${getRankTextStyle(rank)} ${
                isCenter ? "border-yellow-200" : "border-gray-200 dark:border-gray-700"
              }
             `}
            >
              #{rank}
            </div>

            {/* Avatar Container */}
            <div className={`relative mb-2 ${isCenter ? "mt-2" : "mt-2"}`}>
              <div
                className={`
                  relative rounded-full overflow-hidden flex items-center justify-center 
                  ${
                    isCenter
                      ? "w-20 h-20 sm:w-24 sm:h-24 ring-4"
                      : "w-14 h-14 sm:w-16 sm:h-16 ring-2"
                  }
                  ${getRingStyle(rank)}
                  bg-white dark:bg-gray-800 shadow-md
                `}
              >
                {loading ? (
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                ) : entry.user_id ? (
                  <img
                    src={
                      entry.profile_picture ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        entry.name || "User"
                      )}&background=D32F2F&color=fff&size=128`
                    }
                    alt={entry.name || "Volunteer"}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        entry.name || "User"
                      )}&background=D32F2F&color=fff&size=128`;
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-300">
                  </div>
                )}
              </div>

              {/* Level Badge Overlay */}
              {entry.user_id && !loading && (
                <div className="absolute -bottom-1 -right-1 z-20">
                  <span
                    className={`
                    inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider
                    border-2 border-white dark:border-gray-900 shadow-sm
                    bg-gray-900 text-white dark:bg-black
                  `}
                  >
                    Lvl {entry.current_level ?? 1}
                  </span>
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="text-center w-full">
              <div className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate w-full px-1">
                {entry.name || (loading ? "Loading..." : "—")}
              </div>

              <div className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                {entry.points?.toLocaleString() ?? 0} POINTS
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}