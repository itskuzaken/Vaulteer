"use client";

import React from "react";

export function SkeletonList({ count = 6, className = "" }) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="modern-card-skeleton"
          style={{
            animationDelay: `${i * 50}ms`,
          }}
        >
          {/* Header with avatar and text */}
          <div className="flex items-center gap-3 mb-4">
            {/* Avatar skeleton */}
            <div
              className="skeleton-shimmer rounded-full flex-shrink-0"
              style={{
                width: "48px",
                height: "48px",
              }}
            />
            {/* Text lines */}
            <div className="flex-1 space-y-2">
              <div
                className="skeleton-shimmer rounded"
                style={{
                  height: "12px",
                  width: "70%",
                }}
              />
              <div
                className="skeleton-shimmer rounded"
                style={{
                  height: "12px",
                  width: "50%",
                }}
              />
            </div>
          </div>

          {/* Content lines */}
          <div className="space-y-3">
            <div
              className="skeleton-shimmer rounded"
              style={{
                height: "12px",
                width: "100%",
              }}
            />
            <div
              className="skeleton-shimmer rounded"
              style={{
                height: "12px",
                width: "90%",
              }}
            />
            <div
              className="skeleton-shimmer rounded"
              style={{
                height: "12px",
                width: "75%",
              }}
            />
          </div>
        </div>
      ))}

      <style jsx>{`
        .modern-card-skeleton {
          background: var(--card-bg, #ffffff);
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1),
            0 1px 2px -1px rgba(0, 0, 0, 0.1);
          animation: fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          opacity: 0;
        }

        .skeleton-shimmer {
          position: relative;
          overflow: hidden;
          background: #e5e7eb;
        }

        .dark .skeleton-shimmer {
          background: #374151;
        }

        .skeleton-shimmer::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.6) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          animation: shimmer 1.5s infinite;
        }

        .dark .skeleton-shimmer::after {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.1) 50%,
            rgba(255, 255, 255, 0) 100%
          );
        }

        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
