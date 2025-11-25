"use client";

import { formatDistanceToNow } from "date-fns";
import {
  IoBonfireOutline,
  IoCalendarOutline,
  IoMedalOutline,
  IoSparklesOutline,
  IoTrophyOutline,
} from "react-icons/io5";
import DashboardSectionCard from "../ui/DashboardSectionCard";

const LEVEL_STEP = 100; // Keep in sync with backend gamificationRules

const ACTION_LABELS = {
  EVENT_REGISTER: "Registered for an event",
  WAITLIST_JOIN: "Joined the waitlist",
  WAITLIST_PROMOTION: "Promoted from waitlist",
  EVENT_ATTEND: "Attended an event",
  EVENT_CANCEL: "Cancelled a registration",
  EVENT_HOST_PUBLISHED: "Published an event",
  STREAK_DAY: "Daily streak bonus",
  BADGE_BONUS: "Badge bonus",
};

function formatActionLabel(event) {
  if (!event?.action) {
    return "Gamification activity";
  }
  return ACTION_LABELS[event.action] || event.action.replace(/_/g, " ");
}

function formatRelativeDate(value) {
  if (!value) return null;
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch (error) {
    return null;
  }
}

export default function MyImpactWidget({ summary }) {
  const stats = summary?.stats || null;
  const totalPoints = stats?.total_points ?? 0;
  const lifetimePoints = stats?.lifetime_points ?? totalPoints;
  const eventsAttended = stats?.events_attended ?? 0;
  const eventsRegistered = stats?.events_registered ?? 0;
  const currentStreak = stats?.current_streak ?? 0;
  const longestStreak = stats?.longest_streak ?? 0;
  const nextLevel = summary?.nextLevel;
  const currentLevel = nextLevel?.currentLevel ?? stats?.current_level ?? 1;
  const levelStart = nextLevel?.nextThreshold
    ? Math.max(0, nextLevel.nextThreshold - LEVEL_STEP)
    : Math.floor(totalPoints / LEVEL_STEP) * LEVEL_STEP;
  const levelWidth = Math.max(
    LEVEL_STEP,
    (nextLevel?.nextThreshold || LEVEL_STEP) - levelStart
  );
  const levelProgress = Math.min(
    100,
    Math.max(0, ((totalPoints - levelStart) / levelWidth) * 100)
  );
  const pointsToNext = Math.max(
    0,
    nextLevel?.remaining ?? LEVEL_STEP - (totalPoints % LEVEL_STEP)
  );
  const recentEvents = summary?.recentEvents?.slice(0, 4) || [];
  const lastUpdated = stats?.updated_at || stats?.last_rewarded_at;

  const statCards = [
    {
      label: "Total Points",
      value: totalPoints.toLocaleString(),
      icon: <IoSparklesOutline className="w-5 h-5 text-amber-500" />,
      helper: lastUpdated
        ? `Updated ${formatRelativeDate(lastUpdated)}`
        : "Earn points by joining events",
    },
    {
      label: "Lifetime Points",
      value: lifetimePoints.toLocaleString(),
      icon: <IoMedalOutline className="w-5 h-5 text-amber-500" />,
      helper: `${eventsRegistered} total registrations`,
    },
    {
      label: "Events Attended",
      value: eventsAttended,
      icon: <IoCalendarOutline className="w-5 h-5 text-amber-500" />,
      helper: `${eventsRegistered} registered overall`,
    },
    {
      label: "Current Streak",
      value: `${currentStreak} day${currentStreak === 1 ? "" : "s"}`,
      icon: <IoBonfireOutline className="w-5 h-5 text-amber-500" />,
      helper: `Best streak: ${longestStreak} days`,
    },
  ];

  const isLoading = !summary;

  return (
    <DashboardSectionCard
      title={isLoading ? "Loading stats" : `Level ${currentLevel}`}
      subtitle="My Impact"
      icon={IoSparklesOutline}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="p-3 sm:p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <span className="inline-flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20 p-1.5 sm:p-2">
                {card.icon}
              </span>
              <span className="text-[0.65rem] sm:text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {card.label}
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
              {isLoading ? "--" : card.value}
            </p>
            <p className="text-[0.65rem] sm:text-xs text-slate-500 dark:text-slate-400 mt-1">
              {card.helper}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          <span>Progress to level {currentLevel + 1}</span>
          <span>{isLoading ? "--" : `${Math.round(levelProgress)}%`}</span>
        </div>
        <div className="h-2.5 sm:h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all"
            style={{ width: `${isLoading ? 0 : levelProgress}%` }}
          />
        </div>
        <p className="text-[0.65rem] sm:text-xs text-slate-500 dark:text-slate-400 mt-2">
          {isLoading
            ? "Crunching numbers..."
            : `${pointsToNext} pts until level ${currentLevel + 1}`}
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <IoTrophyOutline className="w-4 h-4 text-amber-500" />
            Recent activity
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {recentEvents.length} updates
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : recentEvents.length ? (
          <ul className="space-y-2 sm:space-y-3">
            {recentEvents.map((event, index) => (
              <li
                key={`${event.action}-${event.created_at}-${index}`}
                className="flex items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border border-slate-100 dark:border-slate-800"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white truncate">
                    {formatActionLabel(event)}
                  </p>
                  <p className="text-[0.65rem] sm:text-xs text-slate-500 dark:text-slate-400">
                    {formatRelativeDate(event.created_at) || "Just now"}
                  </p>
                </div>
                <span
                  className={`text-xs sm:text-sm font-semibold whitespace-nowrap ${
                    (event.points_delta || 0) >= 0
                      ? "text-emerald-600"
                      : "text-rose-500"
                  }`}
                >
                  {(event.points_delta > 0 ? "+" : "") +
                    (event.points_delta || 0)}{" "}
                  pts
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Complete an activity to start your streak and earn points.
          </div>
        )}
      </div>
    </DashboardSectionCard>
  );
}
