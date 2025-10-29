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
  const colorClasses = {
    red: "hover:border-red-500 dark:hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/10",
    blue: "hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10",
    green:
      "hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/10",
    yellow:
      "hover:border-yellow-500 dark:hover:border-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/10",
    purple:
      "hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10",
  };

  return (
    <button
      onClick={onClick}
      className={`
        group
        w-full 
        bg-white dark:bg-gray-800 
        rounded-2xl 
        shadow-md hover:shadow-xl
        border-2 border-gray-200 dark:border-gray-700 
        p-6 
        transition-all duration-300 
        text-left 
        ${colorClasses[color]} 
        hover:scale-[1.02]
        focus:outline-none focus:ring-2 focus:ring-${color}-500 dark:focus:ring-${color}-400
      `}
    >
      <div className="flex items-start gap-4">
        {icon && (
          <div className="text-4xl text-gray-600 dark:text-gray-300 group-hover:scale-110 transition-transform">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white">
              {title}
            </h4>
            {badge && (
              <span className="flex-shrink-0 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {description}
          </p>
          <div className="flex items-center text-sm font-medium text-red-600 dark:text-red-400">
            <span>Get started</span>
            <svg
              className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
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
