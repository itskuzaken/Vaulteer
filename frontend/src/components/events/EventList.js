"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import EventCard from "@/components/events/EventCard";
import EventFilters from "@/components/events/EventFilters";
import {
  EventListEmptyState,
  EventListSkeleton,
} from "@/components/events/EventListStates";
import { useNotify } from "@/components/ui/NotificationProvider";
import { getAllEvents } from "@/services/eventService";
import Pagination from "@/components/pagination/Pagination";

const PAGE_SIZE = 6;

export default function EventList({
  defaultFilters,
  lockedFilters = {},
  managerActionsProvider,
  emptyState,
  canManageEvents = false,
  onEventClick,
  refreshToken = 0,
  authReady = true,
}) {
  const notify = useNotify();
  const baseFilters = useMemo(
    () => ({
      ...(defaultFilters || {}),
      ...(lockedFilters || {}),
    }),
    [defaultFilters, lockedFilters]
  );

  const [filters, setFilters] = useState(baseFilters);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setFilters(baseFilters);
    setPage(1);
  }, [baseFilters]);

  const effectiveFilters = useMemo(
    () => ({
      ...filters,
      ...(lockedFilters || {}),
    }),
    [filters, lockedFilters]
  );

  const offset = useMemo(() => Math.max((page - 1) * PAGE_SIZE, 0), [page]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAllEvents({
        ...effectiveFilters,
        limit: PAGE_SIZE,
        offset,
      });
      const eventData = Array.isArray(response?.data) ? response.data : [];
      const totalCount =
        typeof response?.total === "number"
          ? response.total
          : typeof response?.count === "number"
          ? response.count
          : eventData.length;
      setEvents(eventData);
      setTotal(totalCount);
    } catch (error) {
      console.error("Error fetching events", error);
      notify?.push(error?.message || "Failed to load events", "error");
    } finally {
      setLoading(false);
    }
  }, [effectiveFilters, notify, offset]);

  useEffect(() => {
    if (!authReady) return;
    fetchEvents();
  }, [authReady, fetchEvents, refreshToken]);

  const handleFilterChange = useCallback((updatedFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...updatedFilters,
    }));
    setPage(1);
  }, []);

  const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 0;

  const handlePageChange = useCallback(
    (nextPage) => {
      setPage((prev) => {
        if (nextPage === prev) return prev;
        if (nextPage < 1) return prev;
        if (totalPages > 0 && nextPage > totalPages) return prev;
        return nextPage;
      });
    },
    [totalPages]
  );

  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(total, offset + events.length);

  const cards = useMemo(() => {
    if (!Array.isArray(events)) return [];
    return events.map((event) => ({
      event,
      actions:
        typeof managerActionsProvider === "function"
          ? managerActionsProvider(event)
          : [],
    }));
  }, [events, managerActionsProvider]);

  const EmptyState = emptyState || {};

  return (
    <div className="space-y-6">
      <EventFilters
        onFilterChange={handleFilterChange}
        initialFilters={effectiveFilters}
        lockedFilters={lockedFilters}
      />

      {loading ? (
        <EventListSkeleton />
      ) : cards.length === 0 ? (
        <EventListEmptyState
          title={EmptyState.title}
          message={EmptyState.message}
          icon={EmptyState.icon}
          action={EmptyState.action}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cards.map(({ event, actions }) => (
              <EventCard
                key={event.uid}
                event={event}
                managerActions={actions}
                showJoinButton={!canManageEvents}
                onClick={
                  onEventClick ? () => onEventClick(event.uid) : undefined
                }
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 px-4 py-3 text-sm text-gray-600 dark:text-gray-300 md:px-6 md:py-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <p className="text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 md:text-left">
                  Showing {rangeStart}-{rangeEnd} of {total} event
                  {total === 1 ? "" : "s"}
                </p>
                <Pagination
                  currentPage={page}
                  totalItems={total}
                  itemsPerPage={PAGE_SIZE}
                  onPageChange={handlePageChange}
                  className="w-full justify-center md:justify-end"
                  ariaLabel="Manage events pagination"
                  accentColor="var(--primary-red, #bb3031)"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
