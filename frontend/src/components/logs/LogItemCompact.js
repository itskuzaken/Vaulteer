"use client";

import React from "react";
import { IoPersonOutline, IoTimeOutline } from "react-icons/io5";

/**
 * LogItemCompact
 * - Mobile-friendly condensed rendering of a log row
 * - Keeps content compact and readable; uses small text sizes and icon-only chips
 */
export default function LogItemCompact({
  log,
  getLogIcon,
  formatTimestamp,
  LOG_TYPES = {},
  SEVERITY_COLORS = {},
}) {
  if (!log) return null;

  const LogIcon = getLogIcon ? getLogIcon(log.type) : null;

  return (
    <div className="flex items-start gap-3">
      <div className="icon-container bg-gray-100 dark:bg-gray-700 rounded-lg p-2 flex items-center justify-center">
        {LogIcon}
      </div>

      <div className="flex-1 min-w-0 log-compact">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="font-medium text-xs md:text-sm text-gray-900 dark:text-white">
                {log.action}
              </div>

              <span
                className={`text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full ${
                  SEVERITY_COLORS[log.severity] || "bg-gray-100 text-gray-600"
                }`}
              >
                {log.severity}
              </span>

              <span className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 truncate">
                {LOG_TYPES[log.type]?.label || log.type}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {formatTimestamp(log.created_at, log.metadata)}
          </div>
        </div>

        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1 md:mt-2 line-clamp-2 md:line-clamp-none">
          {log.description}
        </p>

        <div className="flex items-center gap-3 text-[11px] md:text-xs text-gray-500 dark:text-gray-400 mt-2 flex-wrap">
          <span className="flex items-center gap-1 truncate">
            <IoPersonOutline className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="truncate">
              {log.performed_by_name} ({log.performed_by_role})
            </span>
          </span>

          {log.ip_address && (
            <span className="truncate">IP: {log.ip_address}</span>
          )}

          {log.metadata &&
            typeof log.metadata === "object" &&
            log.metadata.localTime && (
              <span className="flex items-center gap-1 truncate">
                <IoTimeOutline className="w-3.5 h-3.5 md:w-4 md:h-4" />
                {log.metadata.localTime}
              </span>
            )}
        </div>

        {log.changes && typeof log.changes === "object" && (
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] md:text-xs">
            {Object.entries(log.changes).map(([key, value], idx) => (
              <span
                key={key}
                className="px-1.5 md:px-2 py-0.5 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded overflow-hidden text-ellipsis"
              >
                {key}: {String(value)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
