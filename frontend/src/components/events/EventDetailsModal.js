"use client";

/**
 * Legacy stub maintained to avoid breaking lazy imports while the codebase
 * fully transitions to routed event details. The real experience now lives at
 * `/dashboard/<role>?content=event&eventUid=...` using `EventDetailsPage`.
 */
export default function EventDetailsModal() {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "EventDetailsModal is deprecated. Use dashboard/<role>?content=event&eventUid=... instead."
    );
  }
  return null;
}
