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
  trend = null, // 'up', 'down', or null
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
      bg: "bg-gray-100 dark:bg-gray-700",
      icon: "text-gray-600 dark:text-gray-400",
      value: "text-gray-900 dark:text-white",
      pulse: "ring-gray-400",
    },
    red: {
      bg: "bg-red-100 dark:bg-red-900/20",
      icon: "text-red-600 dark:text-red-400",
      value: "text-red-600 dark:text-red-400",
      pulse: "ring-red-400",
    },
    blue: {
      bg: "bg-blue-100 dark:bg-blue-900/20",
      icon: "text-blue-600 dark:text-blue-400",
      value: "text-blue-600 dark:text-blue-400",
      pulse: "ring-blue-400",
    },
    green: {
      bg: "bg-green-100 dark:bg-green-900/20",
      icon: "text-green-600 dark:text-green-400",
      value: "text-green-600 dark:text-green-400",
      pulse: "ring-green-400",
    },
    amber: {
      bg: "bg-amber-100 dark:bg-amber-900/20",
      icon: "text-amber-600 dark:text-amber-400",
      value: "text-amber-600 dark:text-amber-400",
      pulse: "ring-amber-400",
    },
    purple: {
      bg: "bg-purple-100 dark:bg-purple-900/20",
      icon: "text-purple-600 dark:text-purple-400",
      value: "text-purple-600 dark:text-purple-400",
      pulse: "ring-purple-400",
    },
  };

  const colors = colorClasses[color] || colorClasses.gray;

  return (
    <div
      className={`
        bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4
        transition-all duration-300 relative overflow-hidden
        ${onClick ? "cursor-pointer hover:shadow-lg hover:scale-[1.02]" : ""}
        ${showPulse ? `ring-2 ${colors.pulse} animate-pulse-ring` : ""}
      `}
      onClick={onClick}
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
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors.bg} opacity-75`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${colors.bg}`}
            ></span>
          </span>
        </div>
      )}

      <div className="flex items-start justify-between">
        {/* Icon */}
        <div className={`p-2 rounded-lg ${colors.bg}`}>
          {Icon && <Icon className={`w-5 h-5 ${colors.icon}`} />}
        </div>

        {/* Trend Indicator */}
        {trend && trendValue && (
          <div
            className={`text-xs flex items-center gap-1 ${
              trend === "up"
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {trend === "up" ? "↑" : "↓"} {trendValue}
          </div>
        )}
      </div>

      {/* Title */}
      <div className="text-sm text-gray-600 dark:text-gray-400 mt-3">
        {title}
      </div>

      {/* Value with Animation */}
      <div
        className={`text-2xl font-bold mt-1 ${colors.value} transition-all duration-300`}
      >
        {loading ? "..." : animatedValue.toLocaleString()}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {subtitle}
        </div>
      )}

      {/* Hover Effect Border */}
      {onClick && (
        <div className="absolute inset-0 border-2 border-transparent hover:border-red-300 dark:hover:border-red-700 rounded-xl transition-colors pointer-events-none"></div>
      )}
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
