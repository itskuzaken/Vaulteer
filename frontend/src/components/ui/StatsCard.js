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
  delta = null,
  trendData = null, // NEW: Array of {date, count} for sparkline
  loading = false,
  animationDuration = 1000,
  onClick = null,
  showRealtimeIndicator = false,
  showNewIndicator = false,
  kpi = null,
  kpiPosition = "right",
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
  const hoverTransform = "hover:shadow-md hover:border-red-500 dark:hover:border-[var(--primary-red)]/40";
  const cursorClass = onClick ? "cursor-pointer" : "";

  return (
    <div
      className={`relative overflow-visible rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 sm:p-4 shadow-sm transition-all duration-300 ${
        cursorClass + " " + hoverTransform
      }`}
      onClick={onClick}
      style={{ minHeight: 44 }}
      aria-busy={loading ? "true" : "false"}
    >
      {/* Loading indicator (non-overlapping) */}
      {/* Do not use an overlay to avoid obscuring content; show inline spinner instead */}
      {/* `aria-busy` is set on root div below when needed */}

      <div className={`flex ${kpiPosition === "bottom" ? "flex-col" : "items-start justify-between"} gap-3 sm:gap-4`}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {Icon && (
            <span
              className={`inline-flex items-center justify-center rounded-full p-1.5 sm:p-2 ${colors.chip}`}
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p
            className={`text-[0.65rem] sm:text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400 ${onClick ? 'cursor-pointer' : ''}`}
            onClick={onClick}
          >
              {title}
              {/** Render a 'New' badge when parent indicates the stat is newly created (previous = 0, current > 0) */}
              {showNewIndicator ? (
                <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-[0.6rem] font-semibold">New</span>
              ) : null}
            </p>
          </div>
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

      <div className={`flex ${kpiPosition === "bottom" ? "flex-col" : "items-center justify-between"} gap-4 mt-3`}>
        {/* Left side: Value and Subtitle */}
        <div className="flex-1 min-w-0">
          <div
            className={`text-xl sm:text-2xl font-semibold leading-tight ${colors.value} transition-all duration-300 ${onClick ? 'cursor-pointer' : ''}`}
            aria-live="polite"
            onClick={onClick}
          >
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded" />
              </div>
            ) : (
              <div className="inline-flex items-center gap-2">
                <span>{animatedValue.toLocaleString()}</span>
                {/* Inline comparative indicator when delta is provided */}
                {delta != null && delta !== undefined && delta !== 'new' && (() => {
                    const numericDelta = Number(delta);
                    if (isNaN(numericDelta)) return null;
                    
                    const isPositive = numericDelta >= 0;
                    const absValue = Math.abs(numericDelta);
                    const displayValue = absValue.toFixed(1);
                    const arrow = isPositive ? '▲' : '▼';
                    const sign = isPositive ? '+' : '-';
                    
                    // Render as a compact trend chip to match the top "trend" badge style
                    return (
                      <span
                        aria-label={`Change: ${sign}${displayValue}%`}
                        title={`${sign}${displayValue}%`}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${isPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'}`}
                      >
                        {arrow} {displayValue}%
                      </span>
                    );
                  })() }
              </div>
            )}
          </div>
          {!loading && subtitle && (
            <p className="mt-1 text-[0.65rem] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
              {subtitle}
            </p>
          )}
          {/* Sparkline for trend visualization */}
          {!loading && trendData && trendData.length >= 2 && (() => {
            const counts = trendData.map(t => t.count || 0);
            const max = Math.max(...counts);
            const min = Math.min(...counts);
            const range = max - min || 1;
            const width = 80;
            const height = 24;
            const points = trendData.map((t, i) => {
              const x = (i / (trendData.length - 1)) * width;
              const y = height - ((t.count - min) / range) * height;
              return `${x},${y}`;
            }).join(' ');
            
            // Determine sparkline color based on card color
            const sparklineColors = {
              gray: '#6b7280',
              red: '#ef4444',
              blue: '#3b82f6',
              green: '#10b981',
              amber: '#f59e0b',
              purple: '#8b5cf6',
            };
            const strokeColor = sparklineColors[color] || sparklineColors.gray;
            
            return (
              <svg width={width} height={height} className="mt-2 opacity-60" aria-label="Trend sparkline">
                <polyline
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={points}
                />
              </svg>
            );
          })()}
        </div>

        {/* Right side or Bottom: DonutKPI (if provided) */}
        {kpi && (
          <div className={`shrink-0 ${kpiPosition === "bottom" ? "w-full" : ""}`}>
            {kpi}
          </div>
        )}
      </div>

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
