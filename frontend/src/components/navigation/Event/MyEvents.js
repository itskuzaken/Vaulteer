"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { getMyEvents } from "../../../services/eventService";
import EventList from "@/components/events/EventList";
import EventsSection from "@/components/events/EventsSection";
import Button from "@/components/ui/Button";
import EventCard from "@/components/events/EventCard";
import { useNotify } from "@/components/ui/NotificationProvider";
import {
  EventListEmptyState,
  EventListSkeleton,
} from "@/components/events/EventListStates";
import { useDashboardUser } from "@/hooks/useDashboardUser";
import { buildEventDetailPath } from "@/utils/dashboardRouteHelpers";

export default function MyEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("registered"); // registered, attended, cancelled, upcoming
  const notify = useNotify();
  const router = useRouter();
  const { user } = useDashboardUser();
  const dashboardRole = user?.role;

  const formatDate = (value, pattern = "MMM dd, yyyy") => {
    if (!value) return "–";
    try {
      return format(new Date(value), pattern);
    } catch (error) {
      return value;
    }
  };

  const fetchMyEvents = useCallback(async () => {
    try {
      setLoading(true);
      let response;
      if (filter === "upcoming") {
        // We'll let EventList (rendered client-side) handle Upcoming fetching when possible.
        // Keep local fetching as a fallback for the non-EventList rendering paths.
        response = { data: [] };
      } else {
        response = await getMyEvents(filter);
      }
      setEvents(response.data || []);
    } catch (error) {
      console.error("Error fetching my events:", error);
      notify?.push(error.message || "Failed to load your events", "error");
    } finally {
      setLoading(false);
    }
  }, [filter, notify]);

  useEffect(() => {
    fetchMyEvents();
  }, [fetchMyEvents]);

  const openEventDetails = useCallback(
    (eventUid) => {
      if (!eventUid) return;
      const targetPath = buildEventDetailPath(
        dashboardRole || "volunteer",
        eventUid
      );
      router.push(targetPath);
    },
    [dashboardRole, router]
  );

  const statusMeta = useMemo(
    () => ({
      registered: {
        pill: "Registered",
        title: "You're confirmed",
        getDescription: (event) =>
          event.registration_date
            ? `Joined on ${formatDate(event.registration_date)}`
            : "Awaiting confirmation details",
      },
      attended: {
        pill: "Attended",
        title: "Thanks for showing up!",
        getDescription: (event) =>
          event.attended_at
            ? `Marked attended on ${formatDate(event.attended_at)}`
            : `Completed on ${formatDate(event.end_datetime)}`,
      },
      cancelled: {
        pill: "Cancelled",
        title: "Registration cancelled",
        getDescription: (event) =>
          event.cancelled_at
            ? `Cancelled on ${formatDate(event.cancelled_at)}`
            : `Originally scheduled for ${formatDate(event.start_datetime_local || event.start_datetime)}`,
      },
      upcoming: {
        pill: "Upcoming",
        title: "Upcoming events",
        getDescription: (event) =>
          event.start_datetime
            ? `Happening on ${formatDate(event.start_datetime_local || event.start_datetime)}`
            : "Happening soon",
      },
    }),
    []
  );

  const renderContextFooter = (event) => {
    const meta = statusMeta[filter];
    if (!meta) return null;
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {meta.pill}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
            {meta.title}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {meta.getDescription(event)}
          </p>
        </div>
        <span className="px-2 sm:px-3 py-1 text-xs font-semibold rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 self-start sm:self-center shrink-0">
          {meta.pill}
        </span>
      </div>
    );
  };

  const emptyMessages = {
    registered: "You haven't registered for any events yet.",
    attended: "You haven't attended any events yet.",
    cancelled: "You haven't cancelled any events.",
    upcoming: "There are no upcoming events at the moment.",
  };

  return (
    <div className="flex justify-center w-full ">
      <div className="w-full max-w-7xl">
        <div className="w-full">
          <EventsSection
            title="My Events"
            subtitle="Events you're participating in or upcoming events you can join"
            actions={null}
          >

      {/* Filter Tabs */}
      <div className="flex gap-1 sm:gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto no-scrollbar pb-1">
        <Button
          size={{ default: "small", sm: "medium" }}
          variant={filter === "registered" ? "primary" : "ghost"}
          onClick={() => setFilter("registered")}
          className={`${filter === "registered" ? "border-b-2 border-red-600 dark:border-red-400" : ""} shrink-0`}
        >
          Registered
        </Button>
        <Button
          size={{ default: "small", sm: "medium" }}
          variant={filter === "upcoming" ? "primary" : "ghost"}
          onClick={() => setFilter("upcoming")}
          className={`${filter === "upcoming" ? "border-b-2 border-red-600 dark:border-red-400" : ""} shrink-0`}
        >
          Upcoming
        </Button>
        <Button
          size={{ default: "small", sm: "medium" }}
          variant={filter === "attended" ? "primary" : "ghost"}
          onClick={() => setFilter("attended")}
          className={`${filter === "attended" ? "border-b-2 border-red-600 dark:border-red-400" : ""} shrink-0`}
        >
          Attended
        </Button>
        <Button
          size={{ default: "small", sm: "medium" }}
          variant={filter === "cancelled" ? "primary" : "ghost"}
          onClick={() => setFilter("cancelled")}
          className={`${filter === "cancelled" ? "border-b-2 border-red-600 dark:border-red-400" : ""} shrink-0`}
        >
          Cancelled
        </Button>
      </div>

      {/* Events Grid */}
      {filter === "upcoming" ? (
        <EventList
          lockedFilters={{ status: "published", date_from: new Date().toISOString() }}
          emptyState={{ title: "No Events Found", message: emptyMessages[filter] }}
          onEventClick={openEventDetails}
        />
      ) : loading ? (
        <EventListSkeleton />
      ) : events.length === 0 ? (
        <EventListEmptyState
          title="No Events Found"
          message={emptyMessages[filter]}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {events.map((event) => (
                <EventCard
                key={event.uid}
                event={
                  filter === "registered" && !event.is_registered
                    ? { ...event, is_registered: true }
                    : event
                }
                showJoinButton={filter === "registered" || filter === "upcoming"}
                onClick={() => openEventDetails(event.uid)}
                contextFooter={renderContextFooter(event)}
              />
            ))}
          </div>

          {/* Event Count */}
          <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6 sm:mt-8">
            Showing {events.length} event{events.length !== 1 ? "s" : ""}
          </div>
        </>
      )}
      </EventsSection>
        </div>
      </div>
    </div>
  );
}
