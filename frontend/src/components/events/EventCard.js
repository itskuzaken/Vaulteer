"use client";

import Image from "next/image";
import { format } from "date-fns";
import {
  IoCalendarOutline,
  IoLocationOutline,
  IoPeopleOutline,
  IoTimeOutline,
} from "react-icons/io5";
import EventStatusBadge from "./EventStatusBadge";
import JoinEventButton from "./JoinEventButton";

export default function EventCard({
  event,
  showJoinButton = true,
  onClick,
  managerActions = [],
  contextFooter,
}) {
  const isClickable = typeof onClick === "function";

  const handleKeyDown = (event) => {
    if (!isClickable) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString) => {
    try {
      return format(new Date(dateString), "h:mm a");
    } catch {
      return dateString;
    }
  };

  const getEventTypeColor = (type) => {
    const colors = {
      training: "text-blue-600 dark:text-blue-400",
      community_service: "text-green-600 dark:text-green-400",
      fundraising: "text-purple-600 dark:text-purple-400",
      meeting: "text-amber-600 dark:text-amber-400",
      social: "text-pink-600 dark:text-pink-400",
      other: "text-gray-600 dark:text-gray-400",
    };
    return colors[type] || colors.other;
  };

  const formatEventType = (type) => {
    if (!type) return "Event";
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const capacityPercentage = event.max_participants
    ? (event.participant_count / event.max_participants) * 100
    : 0;

  const isNearCapacity = capacityPercentage >= 80;

  return (
    <div
      className={`group flex h-full flex-col overflow-hidden rounded-xl sm:rounded-2xl border border-gray-200 bg-white p-0 text-left shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:border-gray-700 dark:bg-gray-900 min-h-[44px] ${
        isClickable ? "cursor-pointer" : ""
      }`}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={handleKeyDown}
    >
      <div className="relative h-40 sm:h-48 w-full overflow-hidden bg-gray-100 dark:bg-gray-900">
        {event.image_url ? (
          <Image
            src={event.image_url}
            alt={event.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
            priority={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-red-400 dark:text-red-500">
            <IoCalendarOutline className="text-5xl sm:text-6xl" />
          </div>
        )}
        <EventStatusBadge
          status={event.status}
          className="top-3 right-3 sm:top-4 sm:right-4"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 sm:gap-4 p-4 sm:p-5 md:p-6">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 sm:px-3 sm:py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 ${getEventTypeColor(
                event.event_type
              )} border-gray-300 dark:border-gray-700 bg-white/70 dark:bg-gray-900/70`}
            >
              {formatEventType(event.event_type)}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-gray-400 dark:text-gray-500 truncate">
              {formatDate(event.start_datetime)}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
            {event.title}
          </h3>
          {event.description && (
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2 sm:line-clamp-3">
              {event.description}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <IoTimeOutline className="text-base sm:text-lg flex-shrink-0" />
            <span className="truncate">
              {formatTime(event.start_datetime)} -{" "}
              {formatTime(event.end_datetime)}
            </span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2">
              <IoLocationOutline className="text-base sm:text-lg flex-shrink-0" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <IoPeopleOutline className="text-base sm:text-lg flex-shrink-0" />
            <span
              className={`font-semibold ${
                isNearCapacity ? "text-amber-600 dark:text-amber-400" : ""
              }`}
            >
              {event.participant_count || 0}
              {event.max_participants ? `/${event.max_participants}` : ""}{" "}
              participants
            </span>
          </div>
        </div>

        {event.max_participants && (
          <div className="w-full">
            <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800">
              <div
                className={`h-full ${
                  isNearCapacity
                    ? "bg-amber-500 dark:bg-amber-600"
                    : "bg-green-500 dark:bg-green-600"
                } transition-all duration-300`}
                style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        {(showJoinButton && event.status === "published") ||
        (Array.isArray(managerActions) && managerActions.length > 0) ? (
          <div
            className="flex flex-wrap gap-2"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {showJoinButton && event.status === "published" && (
              <JoinEventButton
                event={event}
                isRegistered={event.is_registered}
                onStatusChange={() => {
                  // Refresh event data if needed
                }}
              />
            )}

            {Array.isArray(managerActions) &&
              managerActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onAction}
                  disabled={action.disabled}
                  className="rounded-full border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-700 transition-all hover:border-gray-300 hover:text-gray-900 dark:border-gray-600 dark:text-gray-200 dark:hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={action.ariaLabel || action.label}
                >
                  {action.label}
                </button>
              ))}
          </div>
        ) : null}

        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {event.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="truncate rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                {tag}
              </span>
            ))}
            {event.tags.length > 3 && (
              <span className="truncate rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                +{event.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {contextFooter && (
          <div className="border-t border-dashed border-gray-200 pt-4 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
            {contextFooter}
          </div>
        )}
      </div>
    </div>
  );
}
