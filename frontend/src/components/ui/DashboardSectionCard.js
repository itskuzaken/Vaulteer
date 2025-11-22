"use client";

import React from "react";

/**
 * Shared dashboard section container
 * Aligns miscellaneous widgets with the RealtimeStatsGrid aesthetic
 */
export default function DashboardSectionCard({
  title = null,
  subtitle = null,
  icon: Icon = null,
  action = null,
  children,
  className = "",
  padding = "p-6",
  bodyClassName = "",
  titleClassName = "text-xl font-semibold text-gray-900 dark:text-white truncate",
  subtitleClassName = "text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400",
  iconWrapperClassName = "inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800",
}) {
  const paddingClass = padding === false ? "" : padding;

  const hasHeader = title || subtitle || Icon || action;

  return (
    <section
      className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm transition-colors ${className}`}
    >
      <div className={paddingClass}>
        {hasHeader && (
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 min-w-0">
              {Icon && (
                <span className={iconWrapperClassName}>
                  <Icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </span>
              )}
              <div className="min-w-0">
                {subtitle && <p className={subtitleClassName}>{subtitle}</p>}
                {title && <h3 className={titleClassName}>{title}</h3>}
              </div>
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
          </div>
        )}
        <div className={bodyClassName}>{children}</div>
      </div>
    </section>
  );
}
