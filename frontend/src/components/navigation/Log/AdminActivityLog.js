"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  IoTimeOutline,
  IoPersonOutline,
  IoShieldCheckmarkOutline,
  IoDocumentTextOutline,
  IoSettingsOutline,
  IoCreateOutline,
  IoDownloadOutline,
  IoCalendarOutline,
} from "react-icons/io5";
import { useNotify } from "../../ui/NotificationProvider";
import {
  fetchActivityLogs,
  fetchActivityLogStats,
  exportActivityLogs,
} from "../../../services/activityLogService";
import Pagination from "../../pagination/Pagination";
import LogFilterSearch from "../../logs/LogFilterSearch";
import LogItemCompact from "../../logs/LogItemCompact";
import { useLogFiltersState } from "../../../hooks/useLogFiltersState";
import { createLogQueryParams } from "../../../utils/logFilters";

const ITEMS_PER_PAGE = 10;

const LOG_TYPES = {
  AUTH: {
    label: "Authentication",
    color: "text-purple-600",
    icon: IoShieldCheckmarkOutline,
  },
  VOLUNTEER_MANAGEMENT: {
    label: "Volunteer Management",
    color: "text-red-600",
    icon: IoPersonOutline,
  },
  STAFF_MANAGEMENT: {
    label: "Staff Management",
    color: "text-blue-600",
    icon: IoPersonOutline,
  },
  APPLICATION: {
    label: "Applications",
    color: "text-amber-600",
    icon: IoDocumentTextOutline,
  },
  EVENT: { label: "Events", color: "text-green-600", icon: IoCalendarOutline },
  POST: { label: "Posts", color: "text-indigo-600", icon: IoCreateOutline },
  SETTINGS: {
    label: "Settings",
    color: "text-gray-600",
    icon: IoSettingsOutline,
  },
  SECURITY: {
    label: "Security",
    color: "text-red-700",
    icon: IoShieldCheckmarkOutline,
  },
  BULK_OPERATION: {
    label: "Bulk Operations",
    color: "text-orange-600",
    icon: IoDocumentTextOutline,
  },
  DATA_ACCESS: {
    label: "Data Access",
    color: "text-cyan-600",
    icon: IoDocumentTextOutline,
  },
};

const SEVERITY_COLORS = {
  HIGH: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-400",
  MEDIUM:
    "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-400",
  LOW: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400",
  INFO: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-400",
  CRITICAL:
    "bg-red-200 text-red-800 border-red-400 dark:bg-red-900/30 dark:text-red-300",
};

const ACTION_OPTIONS = [
  { value: "ALL", label: "All Actions" },
  { value: "LOGIN", label: "Login" },
  { value: "LOGOUT", label: "Logout" },
  { value: "CREATE", label: "Create" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
  { value: "APPROVE", label: "Approve" },
  { value: "REJECT", label: "Reject" },
  { value: "EXPORT", label: "Export" },
  { value: "ROLE_UPDATE", label: "Role Update" },
];

const ACTOR_ROLE_OPTIONS = [
  { value: "ALL", label: "All Roles" },
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "volunteer", label: "Volunteer" },
  { value: "system", label: "System" },
  { value: "unknown", label: "Unknown" },
];

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
];

const SEVERITY_OPTIONS = [
  { value: "ALL", label: "All Severities" },
  { value: "INFO", label: "Info" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

export default function AdminActivityLog() {
  const notify = useNotify();
  const isFirstLoadRef = useRef(true);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    high_severity: 0,
    today_count: 0,
    security_events: 0,
  });
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [totalLogs, setTotalLogs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const initialFilters = useMemo(
    () => ({
      search: "",
      type: "ALL",
      severity: "ALL",
      action: "ALL",
      actorRole: "ALL",
      status: "ALL",
      startDate: "",
      endDate: "",
    }),
    []
  );

  const { filters, debouncedSearch, setFilter, resetFilters, activeFilters } =
    useLogFiltersState("admin-activity-log-filters", initialFilters, 400);

  const filterConfig = useMemo(
    () => ({
      searchPlaceholder: "Search by user, action, or description...",
      fields: [
        {
          type: "select",
          key: "type",
          label: "Log Type",
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
          key: "severity",
          label: "Severity",
          options: SEVERITY_OPTIONS,
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
          type: "select",
          key: "action",
          label: "Action",
          options: ACTION_OPTIONS,
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
          high_severity: parseInt(statsObj.high_severity || 0, 10),
          today_count: parseInt(statsObj.today_count || 0, 10),
          security_events: parseInt(statsObj.security_events || 0, 10),
        });
      } catch (error) {
        if (ignore) return;
        console.error("Error fetching log stats:", error);
        notify?.push("Failed to load log statistics", "error");
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
    filters.severity,
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
  const shouldShowPagination = totalPages > 1;

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
      notify?.push("Logs exported successfully", "success");
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
            Monitor all system activities and user actions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportLogs}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <IoDownloadOutline className="w-5 h-5" />
            Export Logs
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Logs
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {stats.total}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            High Severity
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
            {stats.high_severity}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Today&apos;s Activity
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {stats.today_count}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Security Events
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {stats.security_events}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex flex-col">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {totalLogs === 0 ? (
                <div className="text-center py-12">
                  <IoDocumentTextOutline className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No logs found matching your filters
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  <div className="px-4 py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-300 flex justify-between">
                    <span>
                      Showing {pageRangeStart}-{pageRangeEnd} of {totalLogs} log
                      entries
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
                      <LogItemCompact
                        log={log}
                        getLogIcon={getLogIcon}
                        formatTimestamp={formatTimestamp}
                        LOG_TYPES={LOG_TYPES}
                        SEVERITY_COLORS={SEVERITY_COLORS}
                      />
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
          </div>
          {shouldShowPagination && (
            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-3">
              <Pagination
                currentPage={currentPage}
                totalItems={totalLogs}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={handlePageChange}
                accentColor="var(--primary-red, #bb3031)"
                ariaLabel="Activity logs pagination"
                className="pt-0"
                maxPageButtons={5}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
