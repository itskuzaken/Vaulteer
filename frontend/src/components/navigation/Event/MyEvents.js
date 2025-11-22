"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { getMyEvents } from "../../../services/eventService";
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
  const [filter, setFilter] = useState("registered"); // registered, attended, cancelled
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
      const response = await getMyEvents(filter);
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
            : `Originally scheduled for ${formatDate(event.start_datetime)}`,
      },
    }),
    []
  );

  const renderContextFooter = (event) => {
    const meta = statusMeta[filter];
    if (!meta) return null;
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-3 flex items-start justify-between gap-3">
        <div>
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
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300">
          {meta.pill}
        </span>
      </div>
    );
  };

  const emptyMessages = {
    registered: "You haven't registered for any events yet.",
    attended: "You haven't attended any events yet.",
    cancelled: "You haven't cancelled any events.",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Events
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Events you have registered for
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setFilter("registered")}
          className={`px-4 py-2 font-medium transition-colors ${
            filter === "registered"
              ? "text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Registered
        </button>
        <button
          onClick={() => setFilter("attended")}
          className={`px-4 py-2 font-medium transition-colors ${
            filter === "attended"
              ? "text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Attended
        </button>
        <button
          onClick={() => setFilter("cancelled")}
          className={`px-4 py-2 font-medium transition-colors ${
            filter === "cancelled"
              ? "text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Cancelled
        </button>
      </div>

      {/* Events Grid */}
      {loading ? (
        <EventListSkeleton />
      ) : events.length === 0 ? (
        <EventListEmptyState
          title="No Events Found"
          message={emptyMessages[filter]}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard
                key={event.uid}
                event={
                  filter === "registered" && !event.is_registered
                    ? { ...event, is_registered: true }
                    : event
                }
                showJoinButton={filter === "registered"}
                onClick={() => openEventDetails(event.uid)}
                contextFooter={renderContextFooter(event)}
              />
            ))}
          </div>

          {/* Event Count */}
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            Showing {events.length} event{events.length !== 1 ? "s" : ""}
          </div>
        </>
      )}
    </div>
  );
}
