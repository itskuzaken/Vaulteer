"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  IoPersonOutline,
  IoDocumentTextOutline,
  IoCalendarOutline,
  IoCreateOutline,
  IoMailOutline,
  IoDownloadOutline,
} from "react-icons/io5";
import { useNotify } from "../../ui/NotificationProvider";
import {
  fetchActivityLogs,
  fetchActivityLogStats,
  exportActivityLogs,
} from "../../../services/activityLogService";
import Pagination from "../../pagination/Pagination";
import LogFilterSearch from "../../logs/LogFilterSearch";
import { useLogFiltersState } from "../../../hooks/useLogFiltersState";
import { createLogQueryParams } from "../../../utils/logFilters";

const ITEMS_PER_PAGE = 10;

const LOG_TYPES = {
  VOLUNTEER_MANAGEMENT: {
    label: "Volunteer Management",
    color: "text-red-600",
    icon: IoPersonOutline,
  },
  APPLICATION: {
    label: "Applications",
    color: "text-amber-600",
    icon: IoDocumentTextOutline,
  },
  EVENT: { label: "Events", color: "text-green-600", icon: IoCalendarOutline },
  POST: { label: "Posts", color: "text-indigo-600", icon: IoCreateOutline },
  COMMUNICATION: {
    label: "Communication",
    color: "text-blue-600",
    icon: IoMailOutline,
  },
  DATA_ACCESS: {
    label: "Data Access",
    color: "text-cyan-600",
    icon: IoDocumentTextOutline,
  },
};

const ACTION_OPTIONS = [
  { value: "ALL", label: "All Actions" },
  { value: "CREATE", label: "Create" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
  { value: "APPROVE", label: "Approve" },
  { value: "REJECT", label: "Reject" },
  { value: "ASSIGN", label: "Assign" },
  { value: "MESSAGE", label: "Message" },
];

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
];

const ACTOR_ROLE_OPTIONS = [
  { value: "ALL", label: "All Roles" },
  { value: "staff", label: "Staff" },
  { value: "volunteer", label: "Volunteer" },
  { value: "admin", label: "Admin" },
  { value: "system", label: "System" },
];

export default function StaffActivityLog() {
  const notify = useNotify();
  const isFirstLoadRef = useRef(true);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    today_count: 0,
    period_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [totalLogs, setTotalLogs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const initialFilters = useMemo(
    () => ({
      search: "",
      type: "ALL",
      action: "ALL",
      actorRole: "ALL",
      status: "ALL",
      startDate: "",
      endDate: "",
    }),
    []
  );

  const { filters, debouncedSearch, setFilter, resetFilters, activeFilters } =
    useLogFiltersState("staff-activity-log-filters", initialFilters, 400);

  const filterConfig = useMemo(
    () => ({
      searchPlaceholder: "Search activities, people, or details...",
      fields: [
        {
          type: "select",
          key: "type",
          label: "Activity Type",
          options: [
            { value: "ALL", label: "All Types" },
            ...Object.entries(LOG_TYPES).map(([key, value]) => ({
              value: key,
              label: value.label,
            })),
          ],
        },
        {
          type: "select",
          key: "action",
          label: "Action",
          options: ACTION_OPTIONS,
        },
        {
          type: "select",
          key: "actorRole",
          label: "User Role",
          options: ACTOR_ROLE_OPTIONS,
        },
        {
          type: "select",
          key: "status",
          label: "Status",
          options: STATUS_OPTIONS,
        },
        {
          type: "daterange",
          startKey: "startDate",
          endKey: "endDate",
          label: "Date Range",
        },
      ],
    }),
    []
  );

  useEffect(() => {
    let ignore = false;

    const fetchStats = async () => {
      try {
        const statsData = await fetchActivityLogStats(7);
        if (ignore) return;
        const statsObj = statsData.data || statsData;
        setStats({
          total: parseInt(statsObj.total || 0, 10),
          today_count: parseInt(statsObj.today_count || 0, 10),
          period_count: parseInt(statsObj.period_count || 0, 10),
        });
      } catch (error) {
        if (ignore) return;
        console.error("Error fetching log stats:", error);
        notify?.push("Failed to load activity stats", "error");
      }
    };

    fetchStats();

    return () => {
      ignore = true;
    };
  }, [notify]);

  useEffect(() => {
    setCurrentPage((prev) => (prev === 1 ? prev : 1));
  }, [
    filters.type,
    filters.action,
    filters.actorRole,
    filters.status,
    filters.startDate,
    filters.endDate,
    debouncedSearch,
  ]);

  useEffect(() => {
    const controller = new AbortController();
    const params = createLogQueryParams(
      filters,
      debouncedSearch,
      ITEMS_PER_PAGE,
      currentPage
    );

    const run = async () => {
      try {
        if (isFirstLoadRef.current) {
          setLoading(true);
        } else {
          setPageLoading(true);
        }

        const payload = await fetchActivityLogs(params, {
          signal: controller.signal,
        });
        const list = Array.isArray(payload.data)
          ? payload.data
          : payload.logs || [];

        setLogs(list);
        const total =
          typeof payload.total === "number"
            ? payload.total
            : payload.count ?? list.length;
        setTotalLogs(total);
      } catch (error) {
        if (error.name === "AbortError") return;
        console.error("Error fetching logs:", error);
        notify?.push("Failed to load activity logs", "error");
      } finally {
        if (isFirstLoadRef.current) {
          setLoading(false);
          isFirstLoadRef.current = false;
        }
        setPageLoading(false);
      }
    };

    run();

    return () => {
      controller.abort();
    };
  }, [filters, debouncedSearch, currentPage, notify]);

  const totalPages = Math.max(1, Math.ceil(totalLogs / ITEMS_PER_PAGE));
  const pageRangeStart = totalLogs ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const pageRangeEnd = totalLogs
    ? Math.min(currentPage * ITEMS_PER_PAGE, totalLogs)
    : 0;

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === currentPage) {
      return;
    }
    setCurrentPage(nextPage);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  };

  const handleExportLogs = async () => {
    try {
      const params = createLogQueryParams(
        filters,
        debouncedSearch,
        ITEMS_PER_PAGE,
        currentPage
      );
      delete params.limit;
      delete params.offset;
      await exportActivityLogs(params);
      notify?.push("Activity log exported successfully", "success");
    } catch (error) {
      console.error("Error exporting logs:", error);
      notify?.push("Failed to export logs", "error");
    }
  };

  const formatTimestamp = (timestamp, metadata = null) => {
    if (!timestamp) return "Unknown";

    try {
      const dateString = metadata?.timestamp || timestamp;
      const date = new Date(dateString);

      if (Number.isNaN(date.getTime())) return "Invalid date";

      const now = new Date();
      const diff = now - date;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return "Just now";
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;

      if (metadata?.localTime) {
        return metadata.localTime;
      }

      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting timestamp:", timestamp, error);
      return "Invalid date";
    }
  };

  const getLogIcon = (type) => {
    const LogIcon = LOG_TYPES[type]?.icon || IoDocumentTextOutline;
    return <LogIcon className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Track your actions and activities in the system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportLogs}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <IoDownloadOutline className="w-5 h-5" />
            Export Activity
          </button>
        </div>
      </div>

      <LogFilterSearch
        filters={filters}
        defaults={initialFilters}
        config={filterConfig}
        onChange={setFilter}
        onReset={resetFilters}
        activeCount={activeFilters}
        isBusy={pageLoading}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Activities
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {stats.total}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">Today</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {stats.today_count}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            This Week
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {stats.period_count}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {totalLogs === 0 ? (
          <div className="text-center py-12">
            <IoDocumentTextOutline className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              No activities found
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            <div className="px-4 py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300 flex justify-between">
              <span>
                Showing {pageRangeStart}-{pageRangeEnd} of {totalLogs}{" "}
                activities
              </span>
              <span>
                Page {currentPage} of {totalPages}
              </span>
            </div>
            {(pageLoading ? [] : logs).map((log) => (
              <div
                key={log.log_id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700 ${
                      LOG_TYPES[log.type]?.color || "text-gray-600"
                    }`}
                  >
                    {getLogIcon(log.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {log.action}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          {LOG_TYPES[log.type]?.label || log.type}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatTimestamp(log.created_at, log.metadata)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {log.description}
                    </p>

                    {log.metadata && typeof log.metadata === "object" && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Object.entries(log.metadata).map(([key, value]) => (
                          <span
                            key={key}
                            className="text-xs px-2 py-1 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                          >
                            {key}: {String(value)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {pageLoading && (
              <div className="p-4">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={totalLogs}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={handlePageChange}
        accentColor="var(--primary-red, #bb3031)"
        ariaLabel="Activity history pagination"
        className="pt-4"
        maxPageButtons={5}
      />
    </div>
  );
}
