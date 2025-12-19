"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  IoChevronBackOutline,
  IoChevronForwardOutline,
  IoCalendarOutline,
  IoLocationOutline,
  IoTimeOutline,
} from "react-icons/io5";
import { useNotify } from "@/components/ui/NotificationProvider";
import { getAllEvents } from "../../services/eventService";
import { useDashboardUser } from "@/hooks/useDashboardUser";
import { buildEventDetailPath } from "@/utils/dashboardRouteHelpers";
import DashboardSectionCard from "../ui/DashboardSectionCard";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarCell({
  date,
  isCurrentMonth,
  isSelected,
  hasEvents,
  onSelect,
}) {
  const baseClasses =
    "w-full aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all";
  const selectedClasses =
    "bg-[var(--primary-red)] text-white shadow-lg shadow-red-500/30";
  const mutedClasses = "text-gray-400 dark:text-gray-600";
  const defaultClasses =
    "text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800";

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      className={`${baseClasses} ${
        isSelected
          ? selectedClasses
          : isCurrentMonth
          ? defaultClasses
          : mutedClasses
      } ${
        hasEvents && !isSelected ? "border border-(--primary-red)/40" : ""
      }`}
      aria-pressed={isSelected}
    >
      <span className="text-sm sm:text-base font-semibold">
        {format(date, "d")}
      </span>
      {hasEvents && !isSelected && (
        <span className="mt-0.5 sm:mt-1 w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-(--primary-red)" />
      )}
      {isSelected && (
        <span className="mt-0.5 sm:mt-1 text-[0.5rem] sm:text-[10px] uppercase tracking-tight opacity-80">
          {isToday(date) ? "Today" : "Selected"}
        </span>
      )}
    </button>
  );
}

export default function DashboardEventsSidebar() {
  const notify = useNotify();
  const router = useRouter();
  const { user } = useDashboardUser();
  const dashboardRole = user?.role;
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [monthlyEvents, setMonthlyEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);

      // Build validated date filters to avoid sending malformed query params
      const startDate = startOfMonth(currentMonth);
      const endDate = endOfMonth(currentMonth);

      const start = format(startDate, "yyyy-MM-dd");
      const end = format(endDate, "yyyy-MM-dd");

      // Validate YYYY-MM-DD format strictly
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const filters = { status: "published", limit: 100 };
      if (dateRegex.test(start)) filters.date_from = start;
      else console.warn('DashboardEventsSidebar: computed invalid start date, skipping date_from filter', start);
      if (dateRegex.test(end)) filters.date_to = end;
      else console.warn('DashboardEventsSidebar: computed invalid end date, skipping date_to filter', end);

      const response = await getAllEvents(filters);

      setMonthlyEvents(response.data || []);
    } catch (error) {
      console.error("Failed to load dashboard events:", error);
      notify?.push(error.message || "Failed to load events", "error");
    } finally {
      setIsLoading(false);
    }
  }, [currentMonth, notify]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    const matrix = [];
    let day = start;

    while (day <= end) {
      const week = [];
      for (let i = 0; i < 7; i += 1) {
        week.push(day);
        day = addDays(day, 1);
      }
      matrix.push(week);
    }

    return matrix;
  }, [currentMonth]);

  const eventsByDate = useMemo(() => {
    const grouped = {};
    monthlyEvents.forEach((event) => {
      const key = format(new Date(event.start_datetime_local || event.start_datetime), "yyyy-MM-dd");
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(event);
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key].sort(
        (a, b) => new Date(a.start_datetime) - new Date(b.start_datetime)
      );
    });

    return grouped;
  }, [monthlyEvents]);

  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const eventsForSelectedDate = eventsByDate[selectedKey] || [];

  const fallbackUpcoming = useMemo(() => {
    const today = new Date();
    return [...monthlyEvents]
      .filter((event) => new Date(event.start_datetime) >= today)
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, 5);
  }, [monthlyEvents]);

  const handleSelectDate = (date) => {
    setSelectedDate(date);
    if (!isSameMonth(date, currentMonth)) {
      setCurrentMonth(date);
    }
  };

  const goToPrevMonth = () => {
    setCurrentMonth((prev) => {
      const next = subMonths(prev, 1);
      setSelectedDate(next);
      return next;
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => {
      const next = addMonths(prev, 1);
      setSelectedDate(next);
      return next;
    });
  };

  const openEventDetails = useCallback(
    (eventUid) => {
      if (!eventUid) return;
      const targetPath = buildEventDetailPath(dashboardRole, eventUid);
      router.push(targetPath);
    },
    [dashboardRole, router]
  );

  const renderEventList = (events) => {
    if (!events.length) {
      return (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
          No events scheduled for this date.
        </div>
      );
    }

    return (
      <div className="space-y-2 sm:space-y-3">
        {events.map((event) => {
            const startTime = format(new Date(event.start_datetime_local || event.start_datetime), "h:mm a");
              const endTime = format(new Date(event.end_datetime_local || event.end_datetime), "h:mm a");
          return (
            <button
              type="button"
              key={event.uid}
              onClick={() => openEventDetails(event.uid)}
              className="w-full text-left p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-(--primary-red) focus:outline-none focus:ring-2 focus:ring-(--primary-red)/60 transition-colors"
            >
              <p className="text-[0.65rem] sm:text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5 sm:gap-2">
                <IoTimeOutline className="text-sm sm:text-base shrink-0" />{" "}
                {startTime} – {endTime}
              </p>
              <p className="mt-1 text-sm sm:text-base font-semibold text-gray-900 dark:text-white line-clamp-2">
                {event.title}
              </p>
              {event.location && (
                <p className="mt-1 flex items-center gap-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  <IoLocationOutline className="shrink-0 text-sm" />
                  <span className="line-clamp-1">{event.location}</span>
                </p>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <DashboardSectionCard
        title={format(currentMonth, "MMMM yyyy")}
        subtitle="Calendar"
        icon={IoCalendarOutline}
        titleClassName="text-lg font-semibold text-gray-900 dark:text-white truncate"
        subtitleClassName="text-[0.65rem] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400"
        iconWrapperClassName="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800"
        action={
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={goToPrevMonth}
              className="p-1.5 sm:p-2 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Previous month"
            >
              <IoChevronBackOutline className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              type="button"
              onClick={goToNextMonth}
              className="p-1.5 sm:p-2 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Next month"
            >
              <IoChevronForwardOutline className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        }
        bodyClassName="space-y-3 sm:space-y-4"
      >
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-[0.65rem] sm:text-xs font-semibold text-gray-500 dark:text-gray-400">
          {DAY_LABELS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {weeks.map((week, index) => (
            <div key={`week-${index}`} className="contents">
              {week.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                return (
                  <CalendarCell
                    key={key}
                    date={day}
                    isCurrentMonth={isSameMonth(day, currentMonth)}
                    isSelected={isSameDay(day, selectedDate)}
                    hasEvents={Boolean(eventsByDate[key]?.length)}
                    onSelect={handleSelectDate}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </DashboardSectionCard>

      <DashboardSectionCard
        title={format(selectedDate, "MMMM dd, yyyy")}
        subtitle="Events on"
        icon={IoCalendarOutline}
        titleClassName="text-lg font-semibold text-gray-900 dark:text-white truncate"
        subtitleClassName="text-[0.65rem] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400"
        iconWrapperClassName="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800"
        action={
          isLoading && <span className="text-xs text-gray-500">Loading…</span>
        }
        bodyClassName="space-y-6"
      >
        {renderEventList(eventsForSelectedDate)}
        {!eventsForSelectedDate.length && fallbackUpcoming.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Upcoming this month
            </p>
            {renderEventList(fallbackUpcoming)}
          </div>
        )}
      </DashboardSectionCard>
    </div>
  );
}
