"use client";

import React from "react";

/**
 * Modern Dashboard Card Component
 * Flexible card container with optional gradient header
 */
export default function DashboardCard({
  title,
  children,
  icon,
  action,
  className = "",
  headerColor = "red",
  noPadding = false,
}) {
  const colorClasses = {
    red: "from-red-600 to-red-700",
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    yellow: "from-yellow-400 to-yellow-500",
    purple: "from-purple-500 to-purple-600",
    indigo: "from-indigo-500 to-indigo-600",
  };

  const gradientClass = colorClasses[headerColor] || colorClasses.red;

  return (
    <div
      className={`
        bg-white dark:bg-gray-800 
        rounded-2xl 
        shadow-lg hover:shadow-xl 
        transition-all duration-300 
        border border-gray-200 dark:border-gray-700 
        overflow-hidden
        ${className}
      `}
    >
      {title && (
        <div
          className={`
            bg-gradient-to-r ${gradientClass} 
            px-6 py-5 
            flex items-center justify-between
          `}
        >
          <div className="flex items-center gap-3">
            {icon && <div className="text-white text-2xl">{icon}</div>}
            <h3 className="text-xl font-bold text-white tracking-tight">
              {title}
            </h3>
          </div>
          {action && <div className="text-white">{action}</div>}
        </div>
      )}
      <div className={noPadding ? "" : "p-6"}>{children}</div>
    </div>
  );
}

/**
 * Modern Stat Card Component
 * Displays key metrics with icons and trend indicators
 */
export function StatCard({
  title,
  value,
  icon,
  trend,
  color = "red",
  description,
  onClick,
}) {
  const colorClasses = {
    red: {
      bg: "bg-red-50 dark:bg-red-900/20",
      icon: "text-red-600 dark:text-red-400",
      text: "text-red-600 dark:text-red-400",
      border: "border-red-200 dark:border-red-800",
    },
    blue: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      icon: "text-blue-600 dark:text-blue-400",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-800",
    },
    green: {
      bg: "bg-green-50 dark:bg-green-900/20",
      icon: "text-green-600 dark:text-green-400",
      text: "text-green-600 dark:text-green-400",
      border: "border-green-200 dark:border-green-800",
    },
    yellow: {
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      icon: "text-yellow-600 dark:text-yellow-400",
      text: "text-yellow-600 dark:text-yellow-400",
      border: "border-yellow-200 dark:border-yellow-800",
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-900/20",
      icon: "text-purple-600 dark:text-purple-400",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-200 dark:border-purple-800",
    },
  };

  const colors = colorClasses[color] || colorClasses.red;
  const isClickable = typeof onClick === "function";

  const CardContent = () => (
    <>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            {title}
          </p>
          <p className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {value}
          </p>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
          {trend && (
            <div
              className={`inline-flex items-center gap-1.5 mt-3 text-sm font-medium px-2 py-1 rounded-lg ${
                trend.isPositive
                  ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                  : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
              }`}
            >
              <span className="text-lg">{trend.isPositive ? "↑" : "↓"}</span>
              <span className="font-semibold">{trend.value}</span>
              <span className="text-xs opacity-75">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div
            className={`
              ${colors.bg} ${colors.icon} ${colors.border}
              p-4 rounded-xl border-2
              shadow-sm
            `}
          >
            <div className="text-3xl">{icon}</div>
          </div>
        )}
      </div>
    </>
  );

  if (isClickable) {
    return (
      <button
        onClick={onClick}
        className={`
          w-full text-left
          bg-white dark:bg-gray-800 
          rounded-2xl 
          shadow-md hover:shadow-xl 
          transition-all duration-300 
          border border-gray-200 dark:border-gray-700 
          hover:border-${color}-500 dark:hover:border-${color}-400
          p-6
          hover:scale-[1.02]
          focus:outline-none focus:ring-2 focus:ring-${color}-500 dark:focus:ring-${color}-400
        `}
      >
        <CardContent />
      </button>
    );
  }

  return (
    <div
      className="
        bg-white dark:bg-gray-800 
        rounded-2xl 
        shadow-md hover:shadow-xl 
        transition-all duration-300 
        border border-gray-200 dark:border-gray-700 
        p-6
      "
    >
      <CardContent />
    </div>
  );
}

/**
 * Modern Quick Action Card Component
 * Interactive card for quick navigation/actions
 */
export function QuickActionCard({
  title,
  description,
  icon,
  onClick,
  color = "red",
  badge,
}) {
  const colorThemes = {
    red: {
      chip: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300",
      accent: "text-red-600 dark:text-red-300",
      hover: "hover:border-red-200 dark:hover:border-red-500/40",
      badge: "bg-red-100/80 text-red-700 dark:bg-red-500/20 dark:text-red-200",
      ring: "focus-visible:ring-red-500 dark:focus-visible:ring-red-400",
    },
    blue: {
      chip: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300",
      accent: "text-blue-600 dark:text-blue-300",
      hover: "hover:border-blue-200 dark:hover:border-blue-500/40",
      badge:
        "bg-blue-100/80 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200",
      ring: "focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400",
    },
    green: {
      chip: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
      accent: "text-emerald-600 dark:text-emerald-300",
      hover: "hover:border-emerald-200 dark:hover:border-emerald-500/40",
      badge:
        "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
      ring: "focus-visible:ring-emerald-500 dark:focus-visible:ring-emerald-400",
    },
    yellow: {
      chip: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300",
      accent: "text-amber-600 dark:text-amber-300",
      hover: "hover:border-amber-200 dark:hover:border-amber-500/40",
      badge:
        "bg-amber-100/80 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
      ring: "focus-visible:ring-amber-500 dark:focus-visible:ring-amber-400",
    },
    purple: {
      chip: "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-300",
      accent: "text-purple-600 dark:text-purple-300",
      hover: "hover:border-purple-200 dark:hover:border-purple-500/40",
      badge:
        "bg-purple-100/80 text-purple-700 dark:bg-purple-500/20 dark:text-purple-200",
      ring: "focus-visible:ring-purple-500 dark:focus-visible:ring-purple-400",
    },
  };

  const theme = colorThemes[color] || colorThemes.red;

  return (
    <button
      onClick={onClick}
      className={`
        group relative w-full rounded-2xl border border-gray-200 dark:border-gray-800
        bg-white dark:bg-gray-900 p-5 text-left shadow-sm transition-all duration-300
        hover:-translate-y-0.5 hover:shadow-md ${theme.hover}
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 ${theme.ring}
      `}
    >
      <div className="flex items-start gap-4">
        {icon && (
          <span
            className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${theme.chip}`}
          >
            {icon}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                Quick action
              </p>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h4>
            </div>
            {badge && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${theme.badge}`}
              >
                {badge}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
          <div
            className={`mt-4 inline-flex items-center text-sm font-semibold ${theme.accent}`}
          >
            <span>Open</span>
            <svg
              className="ml-1 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </div>
    </button>
  );
}
