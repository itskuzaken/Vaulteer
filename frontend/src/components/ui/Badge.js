"use client";

import React from "react";

const STATUS_STYLES = {
  active: {
    bg: "bg-green-50 dark:bg-green-900/20",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
    dot: "bg-green-500",
  },
  inactive: {
    bg: "bg-gray-50 dark:bg-gray-800/50",
    text: "text-gray-600 dark:text-gray-400",
    border: "border-gray-200 dark:border-gray-700",
    dot: "bg-gray-400",
  },
  pending: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  rejected: {
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
    dot: "bg-red-500",
  },
};

export function Badge({ status, children, showDot = true, className = "" }) {
  const styles = STATUS_STYLES[status] || STATUS_STYLES.inactive;
  const displayText = children || status;

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        ${styles.bg} ${styles.text} ${styles.border}
        border rounded-full
        px-2.5 py-1
        text-xs font-semibold
        uppercase tracking-wide
        transition-all duration-200 ease-in-out
        ${className}
      `}
      style={{
        letterSpacing: "0.5px",
      }}
    >
      {showDot && (
        <span
          className={`${styles.dot} w-1.5 h-1.5 rounded-full`}
          style={{
            animation:
              status === "pending"
                ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
                : "none",
          }}
        />
      )}
      {displayText}

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </span>
  );
}
