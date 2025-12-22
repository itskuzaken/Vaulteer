"use client";

import { useEffect, useMemo, useState } from "react";
import { IoPeopleOutline, IoTrophyOutline, IoExpandOutline } from "react-icons/io5";
import { useRouter } from "next/navigation";
import { getLeaderboard } from "../../services/gamificationService";
import { useNotify } from "../ui/NotificationProvider";
import DashboardSectionCard from "../ui/DashboardSectionCard";

const PERIOD_OPTIONS = [
  { key: "monthly", label: "30 days" },
  { key: "all", label: "All time" },
];

function formatName(entry) {
  if (entry?.name) return entry.name;
  if (entry?.email) return entry.email.split("@")[0];
  return "Volunteer";
}

function getAvatarUrl(user) {
  if (user?.profile_picture) return user.profile_picture;
  if (user?.photoUrl) return user.photoUrl;
  const name = user?.name || user?.email || "User";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=D32F2F&color=fff&size=128`;
}

// Helper for the Rank Circle (Left side)
function getRankIconStyle(rank) {
  switch (rank) {
    case 1:
      return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30";
    case 2:
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-500/30";
    case 3:
      return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30";
    default:
      return "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700";
  }
}

// Helper for the List Item Border & Background
function getRowStyle(rank) {
  switch (rank) {
    case 1:
      // Gold
      return "border-yellow-400 dark:border-yellow-600 bg-yellow-50/50 dark:bg-yellow-900/10";
    case 2:
      // Silver
      return "border-slate-300 dark:border-slate-500 bg-slate-50/50 dark:bg-slate-900/10";
    case 3:
      // Bronze
      return "border-orange-300 dark:border-orange-600 bg-orange-50/50 dark:bg-orange-900/10";
    default:
      // Default
      return "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900";
  }
}

export default function LeaderboardCard({ limit = 5 }) {
  const router = useRouter();
  const [period, setPeriod] = useState(PERIOD_OPTIONS[0].key);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const notify = useNotify();

  useEffect(() => {
    let cancelled = false;

    async function loadLeaderboard() {
      setLoading(true);
      setError(null);
      try {
        const data = await getLeaderboard(period, limit);
        if (cancelled) return;
        setEntries(data || []);
      } catch (err) {
        console.error("Failed to load leaderboard", err);
        if (cancelled) return;
        setError("Unable to load leaderboard");
        notify?.push?.("Unable to load leaderboard", "error");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLeaderboard();
    return () => {
      cancelled = true;
    };
  }, [limit, notify, period]);

  const decoratedEntries = useMemo(() => {
    return entries
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }))
      .filter((e) => (e.role ? e.role === "volunteer" : true));
  }, [entries]);

  return (
    <DashboardSectionCard
      title="Top Volunteers"
      subtitle="Leaderboard"
      icon={IoTrophyOutline}
      titleClassName="text-lg font-semibold text-gray-900 dark:text-white truncate"
      subtitleClassName="text-[0.65rem] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400"
      iconWrapperClassName="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800"
      action={
        <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`
                text-[0.65rem] sm:text-xs font-semibold px-3 py-1.5 rounded-md transition-all duration-200
                ${
                  period === option.key
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }
              `}
              onClick={() => setPeriod(option.key)}
            >
              {option.label}
            </button>
          ))}

          <button
            type="button"
            title="Open full leaderboard"
            aria-label="Open full leaderboard"
            onClick={() => {
              try {
                const path = window.location.pathname || '/dashboard/volunteer';
                router.push(`${path}?content=leaderboard`);
              } catch (e) {
                console.error('Failed to navigate to full leaderboard', e);
              }
            }}
            className="inline-flex items-center justify-center p-1 rounded-md text-gray-500 hover:text-gray-900 dark:hover:text-white bg-transparent focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-red"
          >
            <IoExpandOutline className="w-4 h-4" />
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: limit }).map((_, i) => (
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
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center p-6 text-center text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20">
          <p>{error}</p>
        </div>
      ) : decoratedEntries.length ? (
        <ul className="flex flex-col gap-3" role="list">
          {decoratedEntries.map((entry) => (
            <li
              key={`${entry.user_id || entry.email}-${entry.rank}`}
              className={`
                relative flex items-center gap-3 sm:gap-4 p-3 rounded-2xl
                border-[1.5px] transition-all duration-200
                ${getRowStyle(entry.rank)}
              `}
              role="listitem"
            >
              {/* Rank Indicator */}
              <div
                className={`
                  w-6 h-6 flex flex-shrink-0 items-center justify-center rounded-full text-xs font-bold border
                  ${getRankIconStyle(entry.rank)}
                `}
              >
                {entry.rank}
              </div>

              {/* Avatar with Level Badge */}
              <div className="relative flex-shrink-0">
                <img
                  src={getAvatarUrl(entry)}
                  alt={formatName(entry)}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover bg-gray-100 dark:bg-gray-800 ring-2 ring-white dark:ring-gray-900"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    const fallbackName = entry?.name || entry?.email || "User";
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      fallbackName
                    )}&background=D32F2F&color=fff&size=128`;
                  }}
                />
                {/* Level Overlay */}
                <div className="absolute -bottom-1 -right-1 z-10 flex items-center justify-center">
                  <span className="bg-gray-900 dark:bg-black text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-gray-900 shadow-sm">
                    Lvl {entry.current_level ?? 1}
                  </span>
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                  {formatName(entry)}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                  {entry.email || "No email"}
                </p>
              </div>

              {/* Points */}
              <div className="text-right flex-shrink-0">
                <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-none tabular-nums">
                  {entry.points?.toLocaleString() ?? 0}
                </p>
                <p className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500 mt-0.5">
                  Points
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center justify-center text-center gap-3 p-8 rounded-2xl bg-gray-50/50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <IoPeopleOutline className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Leaderboard is empty
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[200px] mx-auto">
              Once volunteers start earning points, they will appear here.
            </p>
          </div>
        </div>
      )}
    </DashboardSectionCard>
  );
}