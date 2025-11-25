"use client";

import { useEffect, useMemo, useState } from "react";
import { IoPeopleOutline, IoTrophyOutline } from "react-icons/io5";
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

export default function LeaderboardCard({ limit = 5 }) {
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
    return entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  }, [entries]);

  return (
    <DashboardSectionCard
      title="Top volunteers"
      subtitle="Leaderboard"
      icon={IoTrophyOutline}
      titleClassName="text-lg font-semibold text-gray-900 dark:text-white truncate"
      subtitleClassName="text-[0.65rem] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400"
      iconWrapperClassName="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800"
      action={
        <div className="flex items-center gap-1 sm:gap-2 bg-gray-50 dark:bg-gray-800 p-1 rounded-full">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`text-[0.65rem] sm:text-xs font-semibold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full transition-all ${
                period === option.key
                  ? "bg-white dark:bg-gray-900 shadow text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400"
              }`}
              onClick={() => setPeriod(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      }
    >
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: limit }).map((_, i) => (
            <div
              key={i}
              className="h-12 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="text-sm text-red-500 dark:text-red-400">{error}</div>
      ) : decoratedEntries.length ? (
        <ul className="space-y-2 sm:space-y-4" role="list">
          {decoratedEntries.map((entry) => (
            <li
              key={`${entry.user_id || entry.email}-${entry.rank}`}
              className={`flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-xl border border-gray-200 dark:border-gray-800 ${
                entry.rank === 1
                  ? "bg-amber-50/60 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/40"
                  : "bg-white dark:bg-gray-900"
              }`}
              role="listitem"
            >
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-xs sm:text-sm font-semibold flex-shrink-0 ${
                  entry.rank === 1
                    ? "bg-amber-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                }`}
              >
                {entry.rank}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {formatName(entry)}
                </p>
                <p className="text-[0.65rem] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                  {entry.email || "No email"}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[0.65rem] sm:text-xs uppercase text-gray-500 dark:text-gray-400 font-medium">
                  Points
                </p>
                <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  {entry.points?.toLocaleString() ?? 0}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center justify-center text-center gap-3 p-6">
          <IoPeopleOutline className="w-10 h-10 text-gray-300" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            The leaderboard will appear once volunteers start earning points.
          </p>
        </div>
      )}
    </DashboardSectionCard>
  );
}
