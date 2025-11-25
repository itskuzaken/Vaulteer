/**
 * Animated Stats Card Component
 * Displays statistics with real-time updates and animations
 */

import React, { useEffect, useState } from "react";
import { useAnimatedCounter } from "../../hooks/useRealtimeStats";

export default function StatsCard({
  title,
  value,
  icon: Icon,
  color = "gray",
  subtitle = null,
  isChanged = false,
  trend = null,
  trendValue = null,
  loading = false,
  animationDuration = 1000,
  onClick = null,
}) {
  const animatedValue = useAnimatedCounter(value || 0, animationDuration);
  const [showPulse, setShowPulse] = useState(false);

  // Trigger pulse animation when value changes
  useEffect(() => {
    if (isChanged) {
      setShowPulse(true);
      const timer = setTimeout(() => setShowPulse(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isChanged]);

  // Color mapping
  const colorClasses = {
    gray: {
      chip: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300",
      value: "text-gray-900 dark:text-white",
      pulse: "ring-gray-300",
      dot: "bg-gray-400 dark:bg-gray-500",
    },
    red: {
      chip: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300",
      value: "text-red-600 dark:text-red-300",
      pulse: "ring-red-300",
      dot: "bg-red-400",
    },
    blue: {
      chip: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300",
      value: "text-blue-600 dark:text-blue-300",
      pulse: "ring-blue-300",
      dot: "bg-blue-400",
    },
    green: {
      chip: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
      value: "text-emerald-600 dark:text-emerald-300",
      pulse: "ring-emerald-300",
      dot: "bg-emerald-400",
    },
    amber: {
      chip: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300",
      value: "text-amber-600 dark:text-amber-300",
      pulse: "ring-amber-300",
      dot: "bg-amber-400",
    },
    purple: {
      chip: "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-300",
      value: "text-purple-600 dark:text-purple-300",
      pulse: "ring-purple-300",
      dot: "bg-purple-400",
    },
  };

  const colors = colorClasses[color] || colorClasses.gray;

  // hover and shadow should match QuickActionCard for consistent UX
  const hoverTransform = "hover:-translate-y-0.5 hover:shadow-md";
  const cursorClass = onClick ? "cursor-pointer" : "";

  return (
    <div
      className={`relative overflow-hidden rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 sm:p-4 shadow-sm transition-all duration-300 ${
        cursorClass + " " + hoverTransform
      } ${showPulse ? `ring-2 ${colors.pulse} animate-pulse-ring` : ""}`}
      onClick={onClick}
      style={{ minHeight: 44 }}
    >
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
        </div>
      )}

      {/* Update Indicator */}
      {showPulse && (
        <div className="absolute top-2 right-2">
          <span className="relative flex h-3 w-3">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors.dot} opacity-75`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${colors.dot}`}
            ></span>
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {Icon && (
            <span
              className={`inline-flex items-center justify-center rounded-full p-1.5 sm:p-2 ${colors.chip}`}
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
          )}
          <p className="text-[0.65rem] sm:text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400">
            {title}
          </p>
        </div>

        {trend && trendValue && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              trend === "up"
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300"
            }`}
          >
            {trend === "up" ? "▲" : "▼"} {trendValue}
          </span>
        )}
      </div>

      <div
        className={`mt-3 text-xl sm:text-2xl font-semibold leading-tight ${colors.value} transition-all duration-300`}
      >
        {" "}
        {loading ? "--" : animatedValue.toLocaleString()}
      </div>
      {!loading && subtitle && (
        <p className="mt-1 text-[0.65rem] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
          {subtitle}
        </p>
      )}

      {/* Hover Effect Border (color aware) */}
      {(() => {
        const hoverBorderClass =
          color === "red"
            ? "hover:border-red-300 dark:hover:border-red-700"
            : color === "blue"
            ? "hover:border-blue-200 dark:hover:border-blue-500/40"
            : color === "green"
            ? "hover:border-emerald-200 dark:hover:border-emerald-500/40"
            : color === "amber"
            ? "hover:border-amber-200 dark:hover:border-amber-500/40"
            : color === "purple"
            ? "hover:border-purple-200 dark:hover:border-purple-500/40"
            : "hover:border-gray-200 dark:hover:border-gray-700";

        return (
          <div
            className={`absolute inset-0 border-2 border-transparent rounded-xl sm:rounded-2xl transition-colors pointer-events-none ${hoverBorderClass}`}
          />
        );
      })()}
    </div>
  );
}

// Add custom animation to global CSS
// This should be added to globals.css:
/*
@keyframes pulse-ring {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse-ring {
  animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1);
}
*/
