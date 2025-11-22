"use client";

import { format } from "date-fns";
import { IoRibbonOutline } from "react-icons/io5";
import DashboardSectionCard from "../ui/DashboardSectionCard";

const CATEGORY_STYLES = {
  participation: {
    chipBg: "bg-sky-100 dark:bg-sky-900/40",
    chipText: "text-sky-600 dark:text-sky-300",
  },
  leadership: {
    chipBg: "bg-purple-100 dark:bg-purple-900/40",
    chipText: "text-purple-600 dark:text-purple-300",
  },
  community: {
    chipBg: "bg-emerald-100 dark:bg-emerald-900/40",
    chipText: "text-emerald-600 dark:text-emerald-300",
  },
  streak: {
    chipBg: "bg-amber-100 dark:bg-amber-900/40",
    chipText: "text-amber-600 dark:text-amber-300",
  },
  default: {
    chipBg: "bg-gray-100 dark:bg-gray-800",
    chipText: "text-gray-600 dark:text-gray-300",
  },
};

function formatEarnedDate(earnedDate) {
  if (!earnedDate) return "Recently earned";
  try {
    return format(new Date(earnedDate), "MMM d, yyyy");
  } catch (error) {
    return "Recently earned";
  }
}

export default function BadgeCarousel({ badges = [], loading = false }) {
  const hasBadges = badges && badges.length > 0;

  return (
    <DashboardSectionCard
      title="Badge showcase"
      subtitle="Achievements"
      icon={IoRibbonOutline}
      action={
        <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
          {hasBadges ? `${badges.length} earned` : "0 earned"}
        </span>
      }
    >
      {loading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="w-64 h-32 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 animate-pulse"
            />
          ))}
        </div>
      ) : hasBadges ? (
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x" role="list">
          {badges.slice(0, 8).map((badge) => {
            const style =
              CATEGORY_STYLES[badge.achievement_category] ||
              CATEGORY_STYLES.default;
            return (
              <article
                key={badge.user_achievement_id || badge.badge_code}
                className="w-64 flex-shrink-0 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm snap-start"
                role="listitem"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-semibold uppercase ${style.chipBg} ${style.chipText}`}
                  >
                    {(badge.achievement_icon &&
                      badge.achievement_icon.slice(0, 2)) ||
                      badge.badge_code?.slice(0, 2) ||
                      "RV"}
                  </div>
                  <div>
                    <p
                      className={`text-xs uppercase tracking-wide font-semibold ${style.chipText}`}
                    >
                      {badge.achievement_category || "Milestone"}
                    </p>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
                      {badge.achievement_name}
                    </h4>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 min-h-[48px]">
                  {badge.achievement_description ||
                    "Keep volunteering to unlock more!"}
                </p>
                <div className="flex items-center justify-between text-xs font-semibold mt-3 text-gray-500 dark:text-gray-400">
                  <span>{formatEarnedDate(badge.earned_date)}</span>
                  {Number.isFinite(badge.achievement_points) &&
                  badge.achievement_points > 0 ? (
                    <span className="text-gray-700 dark:text-gray-200">
                      +{badge.achievement_points} pts
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center">
          <IoRibbonOutline className="w-10 h-10 mx-auto mb-3 text-gray-400" />
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            No badges yet
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Join events, keep your streak, and complete activities to unlock
            your first badge.
          </p>
        </div>
      )}
    </DashboardSectionCard>
  );
}
